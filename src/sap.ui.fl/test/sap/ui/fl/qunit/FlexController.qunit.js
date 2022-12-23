/*global QUnit*/

sap.ui.define([
	"sap/ui/fl/initial/_internal/changeHandlers/ChangeHandlerStorage",
	"sap/ui/fl/FlexController",
	"sap/ui/fl/Layer",
	"sap/ui/core/Control",
	"sap/ui/fl/write/api/Version",
	"sap/ui/fl/Utils",
	"sap/ui/fl/changeHandler/HideControl",
	"sap/ui/fl/ChangePersistenceFactory",
	"sap/ui/fl/apply/api/ControlVariantApplyAPI",
	"sap/ui/fl/apply/_internal/controlVariants/URLHandler",
	"sap/ui/fl/apply/_internal/changes/Applier",
	"sap/ui/fl/apply/_internal/changes/FlexCustomData",
	"sap/ui/fl/apply/_internal/changes/Utils",
	"sap/ui/fl/apply/_internal/changes/Reverter",
	"sap/ui/fl/apply/_internal/flexObjects/FlexObjectFactory",
	"sap/ui/fl/write/_internal/Versions",
	"sap/ui/fl/write/_internal/Storage",
	"sap/ui/model/json/JSONModel",
	"sap/base/Log",
	"sap/base/util/deepClone",
	"sap/ui/core/Component",
	"sap/ui/core/util/reflection/JsControlTreeModifier",
	"sap/ui/core/Manifest",
	"sap/ui/core/UIComponent",
	"sap/m/Label",
	"sap/ui/thirdparty/sinon-4"
], function(
	ChangeHandlerStorage,
	FlexController,
	Layer,
	Control,
	Version,
	Utils,
	HideControl,
	ChangePersistenceFactory,
	ControlVariantApplyAPI,
	URLHandler,
	Applier,
	FlexCustomData,
	ChangeUtils,
	Reverter,
	FlexObjectFactory,
	Versions,
	Storage,
	JSONModel,
	Log,
	deepClone,
	Component,
	JsControlTreeModifier,
	Manifest,
	UIComponent,
	Label,
	sinon
) {
	"use strict";

	var sandbox = sinon.createSandbox();

	var oComponent;

	function getInitialChangesMap(mPropertyBag) {
		mPropertyBag = mPropertyBag || {};
		return {
			mChanges: mPropertyBag.mChanges || {},
			mDependencies: mPropertyBag.mDependencies || {},
			mDependentChangesOnMe: mPropertyBag.mDependentChangesOnMe || {},
			mControlsWithDependencies: mPropertyBag.mControlsWithDependencies || {},
			aChanges: mPropertyBag.aChanges || [],
			dependencyRemovedInLastBatch: []
		};
	}

	function getLabelChangeContent(sFileName, sSelectorId, sChangeType) {
		return {
			fileType: "change",
			layer: Layer.USER,
			fileName: sFileName || "a",
			namespace: "b",
			packageName: "c",
			changeType: sChangeType || "labelChange",
			creation: "",
			reference: "",
			selector: {
				id: sSelectorId || "abc123"
			},
			content: {
				something: "createNewVariant"
			}
		};
	}

	var labelChangeContent = getLabelChangeContent("a");
	var labelChangeContent2 = getLabelChangeContent("a2");
	var labelChangeContent3 = getLabelChangeContent("a3", null, "myFancyChangeType");
	var labelChangeContent4 = getLabelChangeContent("a4", "foo");
	var labelChangeContent5 = getLabelChangeContent("a5", "bar");

	QUnit.module("sap.ui.fl.FlexController", {
		beforeEach: function() {
			this.oFlexController = new FlexController("testScenarioComponent", "1.2.3");
			this.oControl = new Control("existingId");
			this.oChange = FlexObjectFactory.createFromFileContent(labelChangeContent);
			if (!oComponent) {
				return Component.create({
					name: "testComponent",
					id: "testComponent",
					metadata: {
						manifest: "json"
					}
				}).then(function(oCreatedComponent) {
					oComponent = oCreatedComponent;
				});
			}
		},
		afterEach: function() {
			sandbox.restore();
			this.oControl.destroy();
			ChangePersistenceFactory._instanceCache = {};
		}
	}, function() {
		QUnit.test("when the constructor is called", function(assert) {
			assert.ok(this.oFlexController instanceof FlexController, "then an instance of FlexController was created");
		});

		QUnit.test("when saveAll is called with skipping the cache", function(assert) {
			var fnChangePersistenceSaveStub = sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves();
			return this.oFlexController.saveAll(oComponent, true)
				.then(function() {
					assert.ok(fnChangePersistenceSaveStub.calledWith(oComponent, true), "the app component, the layer and the flag were passed");
				});
		});

		QUnit.test("when saveAll is called with bCondenseAnyLayer", function(assert) {
			var fnChangePersistenceSaveStub = sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves();
			return this.oFlexController.saveAll(oComponent, false, false, Layer.VENDOR, false, true)
				.then(function() {
					assert.ok(fnChangePersistenceSaveStub.calledWith(oComponent, false, undefined, undefined, undefined, true, Layer.VENDOR), "the app component and the flag were passed");
				});
		});

		QUnit.test("when saveAll is called with a layer and bRemoveOtherLayerChanges", function(assert) {
			var oComp = {
				name: "testComp",
				getModel: function() {
					return {
						id: "variantModel"
					};
				}
			};
			sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves();
			var oRemoveStub = sandbox.stub(this.oFlexController._oChangePersistence, "removeDirtyChanges").resolves([]);
			var oUrlHandlerStub = sandbox.stub(URLHandler, "update");
			return this.oFlexController.saveAll(oComp, true, false, Layer.CUSTOMER, true)
				.then(function() {
					var aLayersToReset = oRemoveStub.firstCall.args[0];
					assert.ok(aLayersToReset.includes(Layer.USER), "then dirty changes on higher layers are removed");
					assert.ok(aLayersToReset.includes(Layer.VENDOR), "then dirty changes on lower layers are removed");
					assert.ok(oUrlHandlerStub.notCalled, "then the page is not reloaded");
				});
		});

		QUnit.test("when saveAll is called without versioning", function(assert) {
			var fnChangePersistenceSaveStub = sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves();
			return this.oFlexController.saveAll(oComponent, undefined, false)
				.then(function() {
					assert.equal(fnChangePersistenceSaveStub.calledWith(oComponent, undefined, undefined, undefined, undefined), true, "then ChangePersistence.saveDirtyChanges() was called with correct parameters");
				});
		});

		QUnit.test("when saveAll is called for a draft without filenames", function(assert) {
			sandbox.stub(Versions, "getVersionsModel").returns(new JSONModel({
				persistedVersion: Version.Number.Draft,
				versions: [{version: Version.Number.Draft, filenames: []}],
				draftFilenames: []
			}));
			var fnChangePersistenceSaveStub = sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves();
			return this.oFlexController.saveAll(oComponent, undefined, true)
				.then(function() {
					assert.equal(fnChangePersistenceSaveStub.calledWith(oComponent, undefined, undefined, Version.Number.Draft, []), true, "then ChangePersistence.saveDirtyChanges() was called with correct parameters");
				});
		});

		QUnit.test("when saveAll is called for a draft with filenames", function(assert) {
			var aFilenames = ["fileName1", "fileName2"];
			var oDraftVersion = {
				version: Version.Number.Draft,
				filenames: aFilenames
			};
			var oFirstVersion = {
				activatedBy: "qunit",
				activatedAt: "a long while ago",
				version: "versionGUID 1"
			};
			var aVersions = [
				oDraftVersion,
				oFirstVersion
			];
			sandbox.stub(Versions, "getVersionsModel").returns(new JSONModel({
				persistedVersion: Version.Number.Draft,
				versions: aVersions,
				draftFilenames: aFilenames
			}));
			var fnChangePersistenceSaveStub = sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves();
			return this.oFlexController.saveAll(oComponent, undefined, true)
				.then(function() {
					assert.equal(fnChangePersistenceSaveStub.calledWith(oComponent, undefined, undefined, Version.Number.Draft, aFilenames), true, "then ChangePersistence.saveDirtyChanges() was called with correct parameters");
				});
		});

		QUnit.test("when saveAll is called with skipping the cache and for draft", function(assert) {
			sandbox.stub(Versions, "getVersionsModel").returns(new JSONModel({
				persistedVersion: Version.Number.Original,
				versions: [{version: Version.Number.Original}]
			}));
			var fnChangePersistenceSaveStub = sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves();
			return this.oFlexController.saveAll(oComponent, true, true)
				.then(function() {
					assert.equal(fnChangePersistenceSaveStub.calledWith(oComponent, true, undefined, Version.Number.Original, undefined), true, "then ChangePersistence.saveDirtyChanges() was called with correct parameters");
				});
		});

		function _runSaveAllAndAssumeVersionsCall(assert, vResponse, nParentVersion, nCallCount) {
			sandbox.stub(Versions, "getVersionsModel").returns(new JSONModel({
				persistedVersion: nParentVersion
			}));
			var oVersionsStub = sandbox.stub(Versions, "onAllChangesSaved");
			var oResult = vResponse ? {response: vResponse} : undefined;
			sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves(oResult);
			return this.oFlexController.saveAll(oComponent, undefined, nParentVersion !== false).then(function() {
				assert.equal(oVersionsStub.callCount, nCallCount);
			});
		}

		QUnit.test("when saveAll is called without draft and no change was saved", function(assert) {
			return _runSaveAllAndAssumeVersionsCall.call(this, assert, undefined, false, 0);
		});

		QUnit.test("when saveAll is called without draft and a change was saved", function(assert) {
			return _runSaveAllAndAssumeVersionsCall.call(this, assert, [{}], false, 0);
		});

		QUnit.test("when saveAll is called without draft and multiple changes were saved", function(assert) {
			return _runSaveAllAndAssumeVersionsCall.call(this, assert, [{}, {}], false, 0);
		});

		QUnit.test("when saveAll is called with draft and no change was saved", function(assert) {
			return _runSaveAllAndAssumeVersionsCall.call(this, assert, undefined, Version.Number.Draft, 0);
		});

		QUnit.test("when saveAll is called with draft and a change was saved", function(assert) {
			return _runSaveAllAndAssumeVersionsCall.call(this, assert, [{reference: "my.app.Component"}], Version.Number.Draft, 1);
		});

		QUnit.test("when saveAll is called with draft and multiple changes were saved", function(assert) {
			return _runSaveAllAndAssumeVersionsCall.call(this, assert, [{reference: "my.app.Component"}, {}], Version.Number.Draft, 1);
		});

		QUnit.test("when saveSequenceOfDirtyChanges is called with an array of changes", function(assert) {
			var fnChangePersistenceSaveStub = sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges");
			var aChanges = ["mockChange1", "mockChange2"];
			this.oFlexController.saveSequenceOfDirtyChanges(aChanges, oComponent);
			assert.ok(fnChangePersistenceSaveStub.calledWith(oComponent, false, aChanges), "then sap.ui.fl.ChangePersistence.saveSequenceOfDirtyChanges() was called with correct parameters");
		});

		QUnit.test("applyChange shall not crash if Applier.applyChangeOnControl throws an error", function(assert) {
			var oControl = new Control();
			var oChange = {};

			sandbox.stub(this.oFlexController, "addChange").resolves(oChange);
			sandbox.stub(Applier, "applyChangeOnControl").rejects();
			sandbox.stub(this.oFlexController._oChangePersistence, "deleteChange");

			return this.oFlexController.applyChange(oChange, oControl)
				.catch(function() {
					assert.ok(true, "then Promise was rejected");
				});
		});

		QUnit.test("addChange shall add a change", function(assert) {
			var oControl = new Control("Id1");

			sandbox.stub(Utils, "getAppComponentForControl").returns(oComponent);

			var fChangeHandler = sandbox.stub();
			fChangeHandler.applyChange = sandbox.stub();
			fChangeHandler.completeChangeContent = sandbox.stub();
			sandbox.stub(ChangeHandlerStorage, "getChangeHandler").resolves(fChangeHandler);

			sandbox.stub(Utils, "getAppDescriptor").returns({
				"sap.app": {
					id: "testScenarioComponent",
					applicationVersion: {
						version: "1.0.0"
					}
				}
			});

			return this.oFlexController.addChange({}, oControl)
				.then(function(oChange) {
					assert.ok(oChange);
					var oChangePersistence = ChangePersistenceFactory.getChangePersistenceForComponent(this.oFlexController.getComponentName());
					var aDirtyChanges = oChangePersistence.getDirtyChanges();

					assert.strictEqual(aDirtyChanges.length, 1);
					assert.strictEqual(aDirtyChanges[0].getSelector().id, "Id1");
					assert.strictEqual(aDirtyChanges[0].getNamespace(), "apps/testScenarioComponent/changes/");
					assert.strictEqual(aDirtyChanges[0].getFlexObjectMetadata().reference, "testScenarioComponent");
				}.bind(this));
		});

		QUnit.test("addPreparedChange shall add a change to flex persistence", function(assert) {
			sandbox.stub(Utils, "getAppComponentForControl").returns(oComponent);
			var oChange = FlexObjectFactory.createFromFileContent(labelChangeContent);

			var oPrepChange = this.oFlexController.addPreparedChange(oChange, oComponent);
			assert.ok(oPrepChange);

			var oChangePersistence = ChangePersistenceFactory.getChangePersistenceForComponent(this.oFlexController.getComponentName());
			var aDirtyChanges = oChangePersistence.getDirtyChanges();

			assert.strictEqual(aDirtyChanges.length, 1);
			assert.strictEqual(aDirtyChanges[0].getSelector().id, "abc123");
			assert.strictEqual(aDirtyChanges[0].getNamespace(), "b");
		});

		QUnit.test("addPreparedChange shall add a change with variant reference to flex persistence and create a variant change", function(assert) {
			assert.expect(8);
			var oAddChangeStub = sandbox.stub();
			var oRemoveChangeStub = sandbox.stub();
			var oModel = {
				addChange: oAddChangeStub,
				removeChange: oRemoveChangeStub,
				getVariant: function() {
					return {
						content: {
							fileName: "idOfVariantManagementReference",
							title: "Standard",
							fileType: "variant",
							reference: "Dummy.Component",
							variantManagementReference: "idOfVariantManagementReference"
						}
					};
				}
			};
			var oAppComponent = {
				getModel: function(sModel) {
					assert.strictEqual(sModel, ControlVariantApplyAPI.getVariantModelName(), "then variant model called on the app component");
					return oModel;
				}
			};

			var oChange = FlexObjectFactory.createFromFileContent(labelChangeContent);

			oChange.setVariantReference("testVarRef");

			var oPrepChange = this.oFlexController.addPreparedChange(oChange, oAppComponent);
			assert.ok(oPrepChange, "then change object returned");
			assert.ok(oAddChangeStub.calledOnce, "then model's addChange is called as VariantManagement Change is detected");
			var oChangePersistence = ChangePersistenceFactory.getChangePersistenceForComponent(this.oFlexController.getComponentName());
			var aDirtyChanges = oChangePersistence.getDirtyChanges();

			assert.strictEqual(aDirtyChanges.length, 1);
			assert.strictEqual(aDirtyChanges[0].getSelector().id, "abc123");
			assert.strictEqual(aDirtyChanges[0].getNamespace(), "b");

			this.oFlexController.deleteChange(oPrepChange, oAppComponent);
			assert.ok(oRemoveChangeStub.calledOnce, "then model's removeChange is called as VariantManagement Change is detected and deleted");
		});

		QUnit.test("resetChanges for control shall call ChangePersistence.resetChanges(), reset control variant URL parameters, and revert changes", function(assert) {
			var oVariantModel = {
				id: "variantModel"
			};
			var oComp = {
				name: "testComp",
				getModel: function() {
					return oVariantModel;
				}
			};
			var sLayer = "testLayer";
			var sGenerator = "test.Generator";
			var sSelectorString = "abc123";
			var sChangeTypeString = "labelChange";
			var aDeletedChanges = [FlexObjectFactory.createFromFileContent({fileName: "change1"}), FlexObjectFactory.createFromFileContent({fileName: "change2"})];
			sandbox.stub(URLHandler, "update");
			sandbox.stub(this.oFlexController._oChangePersistence, "resetChanges").callsFake(function() {
				assert.strictEqual(arguments[0], sLayer, "then correct layer passed");
				assert.strictEqual(arguments[1], sGenerator, "then correct generator passed");
				assert.strictEqual(arguments[2], sSelectorString, "then correct selector string passed");
				assert.strictEqual(arguments[3], sChangeTypeString, "then correct change type string passed");
				return Promise.resolve(aDeletedChanges);
			});
			var oRevertMultipleChangesStub = sandbox.stub(Reverter, "revertMultipleChanges").resolves();
			return this.oFlexController.resetChanges(sLayer, sGenerator, oComp, sSelectorString, sChangeTypeString)
				.then(function() {
					assert.ok(oRevertMultipleChangesStub.calledOnce, "the revertMultipleChanges is called once");
					assert.deepEqual(oRevertMultipleChangesStub.args[0][0], aDeletedChanges, "with the correct changes");
					assert.deepEqual(oRevertMultipleChangesStub.args[0][0][0].getId(), "change2", "with the correct reverse order");
					assert.deepEqual(URLHandler.update.getCall(0).args[0], {
						parameters: [],
						updateURL: true,
						updateHashEntry: true,
						model: oVariantModel
					}, "then URLHandler._setTechnicalURLParameterValues with the correct parameters");
				});
		});

		QUnit.test("resetChanges for whole component shall call ChangePersistance.resetChanges(), reset control variant URL parameters but do not revert changes", function(assert) {
			assert.expect(4);

			var oVariantModel = {
				id: "variantModel"
			};
			var oComp = {
				name: "testComp",
				getModel: function() {
					return oVariantModel;
				}
			};
			var sLayer = "testLayer";
			var sGenerator = "test.Generator";
			sandbox.stub(URLHandler, "update");
			sandbox.stub(this.oFlexController._oChangePersistence, "resetChanges").callsFake(function() {
				assert.strictEqual(arguments[0], sLayer, "then correct layer passed");
				assert.strictEqual(arguments[1], sGenerator, "then correct generator passed");
				return Promise.resolve([]);
			});
			var oRevertMultipleChangesStub = sandbox.stub(Reverter, "revertMultipleChanges").resolves();
			return this.oFlexController.resetChanges(sLayer, sGenerator, oComp)
				.then(function() {
					assert.equal(oRevertMultipleChangesStub.callCount, 0, "the revertMultipleChanges is not called");
					assert.deepEqual(URLHandler.update.getCall(0).args[0], {
						parameters: [],
						updateURL: true,
						updateHashEntry: true,
						model: oVariantModel
					}, "then URLHandler._setTechnicalURLParameterValues with the correct parameters");
				});
		});

		QUnit.test("resetChanges for whole component was called and two changes are present, one related to a control variant", function(assert) {
			assert.expect(3);

			var oDeletedChangeWithVariantReference = FlexObjectFactory.createFromFileContent({
				variantReference: "someReference"
			});

			var oDeletedChange = FlexObjectFactory.createFromFileContent({});

			var oVariantModel = {
				id: "variantModel",
				removeChange: function (oChange) {
					assert.equal(oChange, oDeletedChangeWithVariantReference, "the Model.removeChange was called for a change with a variant reference");
				}
			};
			var oComp = {
				name: "testComp",
				getModel: function() {
					return oVariantModel;
				}
			};
			var sLayer = "testLayer";
			var sGenerator = "test.Generator";
			sandbox.stub(URLHandler, "update");
			sandbox.stub(this.oFlexController._oChangePersistence, "resetChanges").callsFake(function() {
				assert.strictEqual(arguments[0], sLayer, "then correct layer passed");
				assert.strictEqual(arguments[1], sGenerator, "then correct generator passed");
				return Promise.resolve([oDeletedChangeWithVariantReference, oDeletedChange]);
			});
			return this.oFlexController.resetChanges(sLayer, sGenerator, oComp);
		});

		QUnit.test("addChange shall add a change and contain the applicationVersion in the connector", function(assert) {
			var oControl = new Control("mockControl");

			sandbox.stub(Utils, "getAppComponentForControl").returns(oComponent);

			var fChangeHandler = sandbox.stub();
			fChangeHandler.applyChange = sandbox.stub();
			fChangeHandler.completeChangeContent = sandbox.stub();
			sandbox.stub(ChangeHandlerStorage, "getChangeHandler").resolves(fChangeHandler);
			sandbox.stub(Storage, "write").resolves();

			return this.oFlexController.addChange({}, oControl).then(function(oChange) {
				assert.ok(oChange);
				var oChangePersistence = ChangePersistenceFactory.getChangePersistenceForComponent(this.oFlexController.getComponentName());
				sandbox.stub(oChangePersistence, "_massUpdateCacheAndDirtyState").returns(undefined);

				return oChangePersistence.saveDirtyChanges();
			}.bind(this))
			.then(function() {
				oControl.destroy();
			});
		});

		QUnit.test("addChange shall add a change using the local ID with respect to the root component as selector", function(assert) {
			var oControl = new Control("testComponent---Id1");

			sandbox.stub(Utils, "getAppComponentForControl").returns(oComponent);

			var fChangeHandler = sandbox.stub();
			fChangeHandler.applyChange = sandbox.stub();
			fChangeHandler.completeChangeContent = sandbox.stub();
			sandbox.stub(ChangeHandlerStorage, "getChangeHandler").resolves(fChangeHandler);

			sandbox.stub(Utils, "getAppDescriptor").returns({
				"sap.app": {
					id: "testScenarioComponent",
					applicationVersion: {
						version: "1.0.0"
					}
				}
			});

			return this.oFlexController.addChange({}, oControl)
				.then(function(oChange) {
					assert.ok(oChange);

					var oChangePersistence = ChangePersistenceFactory.getChangePersistenceForComponent(this.oFlexController.getComponentName());
					var aDirtyChanges = oChangePersistence.getDirtyChanges();

					assert.strictEqual(aDirtyChanges.length, 1);
					assert.strictEqual(aDirtyChanges[0].getSelector().id, "Id1");
					assert.ok(aDirtyChanges[0].getSelector().idIsLocal);
					assert.strictEqual(aDirtyChanges[0].getNamespace(), "apps/testScenarioComponent/changes/");
					assert.strictEqual(aDirtyChanges[0].getFlexObjectMetadata().reference, "testScenarioComponent");
					oControl.destroy();
				}.bind(this));
		});
		//TODO non local id

		QUnit.test("createAndApplyChange shall remove the change from the persistence and rethrow the error, if applying the change raised an exception", function(assert) {
			var oControl = new Control();
			var oChangeSpecificData = {
				changeType: "hideControl",
				selector: {id: "control1"}
			};

			sandbox.stub(Applier, "applyChangeOnControl").resolves(({
				success: false,
				error: new Error("myError")
			}));
			sandbox.stub(ChangeHandlerStorage, "getChangeHandler").resolves(HideControl);
			sandbox.stub(this.oFlexController, "createChangeWithControlSelector").resolves(FlexObjectFactory.createFromFileContent(oChangeSpecificData));
			sandbox.stub(this.oFlexController._oChangePersistence, "_addPropagationListener");
			sandbox.spy(this.oFlexController._oChangePersistence, "deleteChange");

			return this.oFlexController.addChange(oChangeSpecificData, oControl)
			.then(function(oChange) {
				return this.oFlexController.applyChange(oChange, oControl);
			}.bind(this))
			.catch(function(oError) {
				assert.equal(oError.message, "myError", "the error was passed correctly");
				assert.strictEqual(this.oFlexController._oChangePersistence.getDirtyChanges().length, 0, "Change persistence should have no dirty changes");
				assert.ok(this.oFlexController._oChangePersistence.deleteChange.calledWith(sandbox.match.any, true), "then ChangePersistence.deleteChange was called with the correct parameters");
			}.bind(this));
		});

		QUnit.test("createAndApplyChange shall add a change to dirty changes and return the change", function(assert) {
			var oControl = new Control();
			var oChangeSpecificData = {
				changeType: "hideControl"
			};
			var oChange = FlexObjectFactory.createFromFileContent(oChangeSpecificData);
			sandbox.stub(Applier, "applyChangeOnControl").resolves({success: true});
			sandbox.stub(ChangeHandlerStorage, "getChangeHandler").resolves(HideControl);
			sandbox.stub(this.oFlexController, "createChangeWithControlSelector").resolves(oChange);
			sandbox.stub(this.oFlexController._oChangePersistence, "_addPropagationListener");

			return this.oFlexController.addChange(oChangeSpecificData, oControl)
			.then(function(oChange) {
				return this.oFlexController.applyChange(oChange, oControl);
			}.bind(this))
			.then(function(oAppliedChange) {
				assert.strictEqual(this.oFlexController._oChangePersistence.getDirtyChanges().length, 1, "then change was added to dirty changes");
				assert.deepEqual(oAppliedChange, oChange, "then the applied change was received");
			}.bind(this));
		});

		QUnit.test("createAndApplyChange shall remove the change from the persistence and throw a generic error, if applying the changefailed without exception", function(assert) {
			var oControl = new Control();
			var oChangeSpecificData = {
				changeType: "hideControl",
				selector: {id: "control1"}
			};

			sandbox.stub(Applier, "applyChangeOnControl").resolves(({success: false}));
			sandbox.stub(ChangeHandlerStorage, "getChangeHandler").resolves(HideControl);
			sandbox.stub(this.oFlexController, "createChangeWithControlSelector").resolves(FlexObjectFactory.createFromFileContent(oChangeSpecificData));
			sandbox.stub(this.oFlexController._oChangePersistence, "_addPropagationListener");

			return this.oFlexController.addChange(oChangeSpecificData, oControl)
			.then(function(oChange) {
				return this.oFlexController.applyChange(oChange, oControl);
			}.bind(this))
			.catch(function(ex) {
				assert.equal(ex.message, "The change could not be applied.", "the generic error is thrown");
				assert.strictEqual(this.oFlexController._oChangePersistence.getDirtyChanges().length, 0, "Change persistence should have no dirty changes");
			}.bind(this));
		});

		QUnit.test("createAndApplyChange shall return Promise.reject() if there was an exception during FlexController.addChange()", function(assert) {
			var oControl = new Control();
			var oChangeSpecificData = {
				changeType: "hideControl",
				selector: {id: "control1"}
			};

			var oApplyChangeOnControlStub = sandbox.stub(Applier, "applyChangeOnControl");
			sandbox.stub(this.oFlexController._oChangePersistence, "_addPropagationListener");

			return this.oFlexController.addChange(oChangeSpecificData, oControl)
			.then(function(oChange) {
				return this.oFlexController.applyChange(oChange, oControl);
			}.bind(this))
			.catch(function(oError) {
				assert.strictEqual(oApplyChangeOnControlStub.callCount, 0, "then Applier.applyChangeOnControl was not called");
				assert.equal(oError.message, "No application component found. To offer flexibility, the control with the ID '" + oControl.getId() + "' has to have a valid relation to its owning application component.", "the generic error is thrown");
				assert.strictEqual(this.oFlexController._oChangePersistence.getDirtyChanges().length, 0, "Change persistence should have no dirty changes");
			}.bind(this));
		});

		QUnit.test("throws an error of a change should be created but no control was passed", function(assert) {
			return this.oFlexController.createChangeWithControlSelector({}, undefined)
				.catch(function() {
					assert.ok(true, "then an exception is thrown.");
				});
		});

		QUnit.test("creates a change for controls with a stable ID which doesn't have the app component's ID as a prefix", function(assert) {
			var oControl = new Control("mockControl5");
			sandbox.stub(Utils, "getAppComponentForControl").returns(oComponent);
			var oDummyChangeHandler = {
				completeChangeContent: function() {}
			};
			sandbox.stub(ChangeHandlerStorage, "getChangeHandler").resolves(oDummyChangeHandler);
			sandbox.stub(Utils, "getAppDescriptor").returns({
				"sap.app": {
					id: "myComponent",
					applicationVersion: {
						version: "1.0.0"
					}
				}
			});
			sandbox.spy(JsControlTreeModifier, "getSelector");

			return this.oFlexController.createChangeWithControlSelector({}, oControl)
				.then(function(oChange) {
					assert.deepEqual(oChange.getSelector().idIsLocal, false, "the selector flags the ID as NOT local.");
					assert.ok(JsControlTreeModifier.getSelector.calledOnce, "then JsControlTreeModifier.getSelector is called to prepare the control selector");
					oControl.destroy();
				});
		});

		QUnit.test("creates a change for controls with a stable ID which has the app component's ID as a prefix", function(assert) {
			var oControl = new Control("testComponent---mockControl");
			sandbox.stub(Utils, "getAppComponentForControl").returns(oComponent);
			var oDummyChangeHandler = {
				completeChangeContent: function() {}
			};
			sandbox.stub(ChangeHandlerStorage, "getChangeHandler").resolves(oDummyChangeHandler);
			sandbox.spy(JsControlTreeModifier, "getSelector");

			return this.oFlexController.createChangeWithControlSelector({}, oControl)
				.then(function(oChange) {
					assert.deepEqual(oChange.getSelector().idIsLocal, true, "the selector flags the ID as local");
					assert.ok(JsControlTreeModifier.getSelector.calledOnce, "then JsControlTreeModifier.getSelector is called to prepare the control selector");
					oControl.destroy();
				});
		});

		QUnit.test("creates a change for a map of a control with ID, control type and appComponent", function(assert) {
			var oAppComponent = new UIComponent();
			var mControl = {id: this.oControl.getId(), appComponent: oAppComponent, controlType: "sap.ui.core.Control"};

			var oDummyChangeHandler = {
				completeChangeContent: function() {}
			};
			sandbox.stub(ChangeHandlerStorage, "getChangeHandler").resolves(oDummyChangeHandler);
			sandbox.stub(Utils, "getAppDescriptor").returns({
				"sap.app": {
					id: "myComponent",
					applicationVersion: {
						version: "1.0.0"
					}
				}
			});

			return this.oFlexController.createChangeWithControlSelector({}, mControl)
				.then(function(oChange) {
					assert.deepEqual(oChange.getSelector().idIsLocal, false, "the selector flags the ID as NOT local.");
					assert.deepEqual(oChange.getSelector().id, this.oControl.getId(), "the selector flags the ID as NOT local.");
				}.bind(this));
		});

		QUnit.test("throws an error if a map of a control has no appComponent or no ID or no controlType", function(assert) {
			var oAppComponent = new UIComponent();
			var mControl1 = {id: this.oControl.getId(), appComponent: undefined, controlType: "sap.ui.core.Control"};
			var mControl2 = {id: undefined, appComponent: oAppComponent, controlType: "sap.ui.core.Control"};
			var mControl3 = {id: this.oControl.getId(), appComponent: oAppComponent, controlType: undefined};

			var oDummyChangeHandler = {
				completeChangeContent: function() {}
			};
			sandbox.stub(ChangeHandlerStorage, "getChangeHandler").resolves(oDummyChangeHandler);

			return this.oFlexController.createChangeWithControlSelector({}, mControl1)
				.catch(function() {
					assert.ok(true, "then an exception is thrown");
				})
				.then(this.oFlexController.createChangeWithControlSelector.bind(this.oFlexController, {}, mControl2))
				.catch(function() {
					assert.ok(true, "then an exception is thrown");
				})
				.then(this.oFlexController.createChangeWithControlSelector.bind(this.oFlexController, {}, mControl3))
				.catch(function() {
					assert.ok(true, "then an exception is thrown");
				});
		});

		QUnit.test("creates a change for extension point", function(assert) {
			var mExtensionPointReference = {
				name: "ExtensionPoint1",
				view: {
					getId: function() {
						return "testScenarioComponent---myView";
					}
				}
			};
			var mExpectedSelector = {
				name: mExtensionPointReference.name,
				viewSelector: {
					id: mExtensionPointReference.view.getId(),
					idIsLocal: false
				}
			};
			sandbox.stub(Utils, "getAppComponentForControl").returns(oComponent);
			var oDummyChangeHandler = {
				completeChangeContent: function() {}
			};
			sandbox.stub(ChangeHandlerStorage, "getChangeHandler").resolves(oDummyChangeHandler);
			sandbox.spy(JsControlTreeModifier, "getSelector");

			return this.oFlexController.createChangeWithExtensionPointSelector({}, mExtensionPointReference)
				.then(function(oChange) {
					assert.deepEqual(oChange.getSelector(), mExpectedSelector, "the selector is correctly set");
					assert.ok(JsControlTreeModifier.getSelector.calledOnce, "then JsControlTreeModifier.getSelector is called to prepare the control selector");
				});
		});
	});

	QUnit.module("processXmlView", {
		beforeEach: function() {
			this.oDOMParser = new DOMParser();
			this.oFlexController = new FlexController("testScenarioComponent", "1.2.3");
			this.oXmlString = '<mvc:View id="testComponent---myView" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" />';
			this.oView = this.oDOMParser.parseFromString(this.oXmlString, "application/xml").documentElement;
		},
		afterEach: function() {
			sandbox.restore();
		}
	}, function() {
		QUnit.test("when processXmlView is called with changes", function(assert) {
			var oGetChangesForViewStub = sandbox.stub(this.oFlexController._oChangePersistence, "getChangesForView").resolves();
			var oApplyAllChangesForXMLView = sandbox.stub(Applier, "applyAllChangesForXMLView").resolves();
			var oLogStub = sandbox.stub(Log, "error");
			var mPropertyBag = {
				viewId: "myView",
				componentId: "testComponent"
			};

			return this.oFlexController.processXmlView(this.oView, mPropertyBag).then(function() {
				assert.ok(oGetChangesForViewStub.calledOnce, "then getChangesForView is called once");
				assert.ok(oApplyAllChangesForXMLView.calledOnce, "then _resolveGetChangesForView is called once");
				assert.equal(oLogStub.callCount, 0, "then error handling is skipped");
			});
		});

		QUnit.test("when processXmlView is called without changes", function(assert) {
			var oGetChangesForViewStub = sandbox.stub(this.oFlexController._oChangePersistence, "getChangesForView").returns(Promise.reject());
			var oApplyAllChangesForXMLView = sandbox.spy(Applier, "applyAllChangesForXMLView");
			var oLogStub = sandbox.stub(Log, "error");
			var mPropertyBag = {
				viewId: "myView",
				componentId: "testComponent"
			};

			return this.oFlexController.processXmlView(this.oView, mPropertyBag).then(function() {
				assert.ok(oGetChangesForViewStub.calledOnce, "then getChangesForView is called once");
				assert.equal(oApplyAllChangesForXMLView.callCount, 0, "then _resolveGetChangesForView is skipped");
				assert.ok(oLogStub.calledOnce, "then error handling is called");
			});
		});
	});

	QUnit.module("applicationVersions when using createBaseChange", {
		beforeEach: function() {
			this.oFlexController = new FlexController("testScenarioComponent");
		},
		afterEach: function() {
			sandbox.restore();
		}
	}, function() {
		QUnit.test("calling createBaseChange without appComponent should throw an Error", function(assert) {
			assert.throws(function() {
				this.oFlexController.createBaseChange({});
			}, Error, "an Error is thrown");
		});
	});

	QUnit.module("applyVariantChanges with two changes for a label", {
		beforeEach: function() {
			this.oControl = new Label(labelChangeContent.selector.id);
			this.oControl4 = new Label(labelChangeContent4.selector.id);
			this.oChange = FlexObjectFactory.createFromFileContent(labelChangeContent); // selector.id === "abc123"
			this.oChange2 = FlexObjectFactory.createFromFileContent(labelChangeContent2); // selector.id === "abc123"
			this.oChange4 = FlexObjectFactory.createFromFileContent(labelChangeContent4); // selector.id === "foo"
			this.oFlexController = new FlexController("testScenarioComponent", "1.2.3");

			var oManifestObj = {
				"sap.app": {
					id: "MyComponent",
					applicationVersion: {
						version: "1.2.3"
					}
				}
			};
			var oManifest = new Manifest(oManifestObj);
			this.oComponent = {
				name: "testScenarioComponent",
				getId: function() { return "RTADemoAppMD"; },
				getManifestObject: function() { return oManifest; }
			};

			this.oAddRunTimeChangeSpy = sandbox.spy(this.oFlexController._oChangePersistence, "_addRunTimeCreatedChangeAndUpdateDependencies");
			this.oApplyChangeOnControlStub = sandbox.stub(Applier, "applyChangeOnControl").resolves(new Utils.FakePromise());
		},
		afterEach: function() {
			this.oControl.destroy();
			this.oControl4.destroy();
			ChangePersistenceFactory._instanceCache = {};
			sandbox.restore();
		}
	}, function() {
		QUnit.test("when applyVariantChanges is called with 2 unapplied changes. One of them has a wrong selector", function(assert) {
			this.oChangeWithWrongSelector = FlexObjectFactory.createFromFileContent(labelChangeContent5);
			return this.oFlexController.applyVariantChanges([this.oChange, this.oChangeWithWrongSelector], this.oComponent).then(function() {
				assert.equal(this.oFlexController._oChangePersistence.getChangesMapForComponent().mChanges["abc123"].length, 1, "then 1 change added to map");
				assert.deepEqual(this.oFlexController._oChangePersistence._mChangesInitial.mControlsWithDependencies["abc123"], [this.oChange.getId()], "then the control dependencies were added to the initial changes map");
				assert.equal(this.oApplyChangeOnControlStub.callCount, 1, "then one change is applied");
				assert.equal(this.oAddRunTimeChangeSpy.callCount, 2, "then two changes were added to the map and dependencies were updated");
			}.bind(this));
		});

		QUnit.test("when applyVariantChanges is called with 2 unapplied changes", function(assert) {
			return this.oFlexController.applyVariantChanges([this.oChange, this.oChange2], this.oComponent).then(function() {
				assert.ok(this.oFlexController._oChangePersistence.getChangesMapForComponent().mChanges["abc123"].length, 2, "then 2 changes added to map");
				assert.deepEqual(this.oFlexController._oChangePersistence._mChangesInitial.mControlsWithDependencies["abc123"], [this.oChange.getId(), this.oChange2.getId()], "then the control dependencies were added to the initial changes map");
				assert.equal(this.oApplyChangeOnControlStub.callCount, 2, "then two changes are applied");
				assert.equal(this.oAddRunTimeChangeSpy.callCount, 2, "both changes were added to the map and dependencies were updated");
			}.bind(this));
		});

		QUnit.test("when applyVariantChanges is called with 3 unapplied changes with two different controls as selector", function(assert) {
			return this.oFlexController.applyVariantChanges([this.oChange, this.oChange2, this.oChange4], this.oComponent).then(function() {
				assert.ok(this.oFlexController._oChangePersistence.getChangesMapForComponent().mChanges["abc123"].length, 2, "then 2 changes of the first control added to map");
				assert.ok(this.oFlexController._oChangePersistence.getChangesMapForComponent().mChanges["foo"].length, 1, "then 1 change of the second control added to map");
				assert.equal(this.oApplyChangeOnControlStub.callCount, 3, "then 3 changes are applied");
				assert.equal(this.oAddRunTimeChangeSpy.callCount, 3, "then three changes were added to the map and dependencies were updated");
			}.bind(this));
		});
	});

	QUnit.module("waitForChangesToBeApplied is called with a control ", {
		beforeEach: function() {
			this.sLabelId = labelChangeContent.selector.id;
			this.sLabelId2 = labelChangeContent5.selector.id;
			this.sLabelId3 = "foobar";
			this.sOtherControlId = "independent-control-with-change";
			this.oControl = new Label(this.sLabelId);
			this.oControl2 = new Label(this.sLabelId2);
			this.oControl3 = new Label(this.sLabelId3);
			this.oOtherControl = new Label(this.sOtherControlId);
			this.oChange = FlexObjectFactory.createFromFileContent(labelChangeContent);
			this.oChange2 = FlexObjectFactory.createFromFileContent(labelChangeContent2);
			this.oChange3 = FlexObjectFactory.createFromFileContent(labelChangeContent3);
			this.oChange4 = FlexObjectFactory.createFromFileContent(labelChangeContent4); // Selector of this change points to no control
			this.oChange5 = FlexObjectFactory.createFromFileContent(labelChangeContent5); // already failed changed (mocked with a stub)
			var mChangeOnOtherControl = deepClone(labelChangeContent3);
			mChangeOnOtherControl.selector.id = this.sOtherControlId;
			mChangeOnOtherControl.fileName = "independentChange";
			this.oChangeOnOtherControl = FlexObjectFactory.createFromFileContent(mChangeOnOtherControl);
			this.mChanges = getInitialChangesMap();
			this.fnGetChangesMap = function() {
				return getInitialChangesMap(this.mChanges);
			}.bind(this);
			this.oFlexController = new FlexController("testScenarioComponent", "1.2.3");

			this.oAddAppliedCustomDataSpy = sandbox.spy(FlexCustomData, "addAppliedCustomData");
			this.oDestroyAppliedCustomDataSpy = sandbox.spy(FlexCustomData, "destroyAppliedCustomData");

			this.oErrorLogStub = sandbox.stub(Log, "error");

			this.oChangeHandlerApplyChangeStub = sandbox.stub().resolves(function(fnResolve) {
				setTimeout(function() {
					fnResolve();
				}, 0);
			});
			this.oChangeHandlerRevertChangeStub = sandbox.stub().resolves(function(fnResolve) {
				setTimeout(function() {
					fnResolve();
				}, 0);
			});

			this.oGetChangeHandlerStub = sandbox.stub(ChangeUtils, "getChangeHandler").resolves({
				applyChange: this.oChangeHandlerApplyChangeStub,
				revertChange: this.oChangeHandlerRevertChangeStub
			});

			sandbox.stub(this.oFlexController._oChangePersistence, "getChangesMapForComponent").returns(this.mChanges);

			var oManifestObj = {
				"sap.app": {
					id: "MyComponent",
					applicationVersion: {
						version: "1.2.3"
					}
				}
			};
			var oManifest = new Manifest(oManifestObj);
			this.oComponent = {
				name: "testScenarioComponent",
				getId: function() {return "RTADemoAppMD";},
				getManifestObject: function() {return oManifest;}
			};
		},
		afterEach: function() {
			this.oControl.destroy();
			this.oControl2.destroy();
			this.oControl3.destroy();
			this.oOtherControl.destroy();
			sandbox.restore();
		}
	}, function() {
		function getControl(oComponent, oControl, bAsInstance) {
			var vReturnValue;
			if (bAsInstance) {
				vReturnValue = oControl;
			} else {
				vReturnValue = {
					id: oControl.getId(),
					controlType: oControl.getMetadata().getName(),
					appComponent: oComponent
				};
			}
			return vReturnValue;
		}

		//a few checks for the selector/instance handling should be sufficient
		[true, false].forEach(function(bAsInstance) {
			var sPrefix = bAsInstance ? "as instance" : "as selector";
			QUnit.test(sPrefix + " with no changes", function(assert) {
				return this.oFlexController.waitForChangesToBeApplied([{selector: getControl(this.oComponent, this.oControl, bAsInstance)}])
					.then(function(oReturn) {
						assert.ok(true, "then the function resolves");
						assert.equal(oReturn, undefined, "the return value is undefined");
					});
			});

			QUnit.test(sPrefix + "with 3 async queued changes", function(assert) {
				assert.expect(2);
				this.mChanges.mChanges[this.sLabelId] = [this.oChange, this.oChange2, this.oChange3];
				Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl);
				return this.oFlexController.waitForChangesToBeApplied([{selector: getControl(this.oComponent, this.oControl, bAsInstance)}])
					.then(function(oReturn) {
						assert.equal(this.oAddAppliedCustomDataSpy.callCount, 3, "addCustomData was called 3 times");
						assert.equal(oReturn, undefined, "the return value is undefined");
					}.bind(this));
			});

			QUnit.test(sPrefix + "together with another control, with 3 async queued changes and another independent control with a change", function(assert) {
				assert.expect(2);
				this.mChanges.mChanges[this.sLabelId] = [this.oChange, this.oChange2, this.oChange3];
				this.mChanges.mChanges[this.sOtherControlId] = [this.oChangeOnOtherControl];
				Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl);
				Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oOtherControl);
				var pWaiting = this.oFlexController.waitForChangesToBeApplied([
					{selector: getControl(this.oComponent, this.oControl, bAsInstance)},
					{selector: getControl(this.oComponent, this.oOtherControl, bAsInstance)}
				]);
				return pWaiting.then(function(oReturn) {
					assert.equal(this.oAddAppliedCustomDataSpy.callCount, 4, "addCustomData was called 4 times");
					assert.equal(oReturn, undefined, "the return value is undefined");
				}.bind(this));
			});
		});

		QUnit.test("with 3 async queued changes dependend on each other and the first throwing an error", function(assert) {
			this.mChanges.mChanges[this.sLabelId] = [this.oChange, this.oChange2, this.oChange3];

			var oChangeHandlerApplyChangeRejectStub = sandbox.stub().throws(new Error());
			this.oGetChangeHandlerStub.restore();
			this.oGetChangeHandlerStub = sandbox.stub(ChangeUtils, "getChangeHandler")
				.onCall(0).resolves({
					applyChange: oChangeHandlerApplyChangeRejectStub
				})
				.onCall(1).resolves({
					applyChange: this.oChangeHandlerApplyChangeStub
				})
				.onCall(2).resolves({
					applyChange: this.oChangeHandlerApplyChangeStub
				});

			Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl);

			return this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl}])
				.then(function() {
					assert.equal(this.oErrorLogStub.callCount, 1, "then the changeHandler threw an error");
					assert.equal(this.oAddAppliedCustomDataSpy.callCount, 2, "addCustomData was called 2 times");
				}.bind(this));
		});

		QUnit.test("twice with 3 async queued changes", function(assert) {
			assert.expect(1);
			this.mChanges.mChanges[this.sLabelId] = [this.oChange, this.oChange2, this.oChange3];
			Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl);

			this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl}]);
			return this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl}])
				.then(function() {
					assert.equal(this.oAddAppliedCustomDataSpy.callCount, 3, "addCustomData was called 3 times");
				}.bind(this));
		});

		QUnit.test("with one async queued change throwing an error", function(assert) {
			var oChangeHandlerApplyChangeRejectStub = sandbox.stub().returns(new Promise(function(fnResolve, fnReject) {
				setTimeout(function() {
					fnReject(new Error());
				}, 0);
			}));
			this.oGetChangeHandlerStub.restore();
			this.oGetChangeHandlerStub = sandbox.stub(ChangeUtils, "getChangeHandler").resolves({
				applyChange: oChangeHandlerApplyChangeRejectStub
			});
			this.mChanges.mChanges[this.sLabelId] = [this.oChange];
			Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl);
			return this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl}])
				.then(function() {
					assert.equal(this.oErrorLogStub.callCount, 1, "then the changeHandler threw an error");
					assert.ok(true, "then the function resolves");
				}.bind(this));
		});

		QUnit.test("twice with one async queued change throwing an error", function(assert) {
			var oChangeHandlerApplyChangeRejectStub = sandbox.stub().returns(new Promise(function(fnResolve, fnReject) {
				setTimeout(function() {
					fnReject(new Error());
				}, 0);
			}));
			this.oGetChangeHandlerStub.restore();
			this.oGetChangeHandlerStub = sandbox.stub(ChangeUtils, "getChangeHandler").resolves({
				applyChange: oChangeHandlerApplyChangeRejectStub
			});
			this.mChanges.mChanges[this.sLabelId] = [this.oChange];
			Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl);
			this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl}]);
			return this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl}])
				.then(function(oReturn) {
					assert.equal(oReturn, undefined, "the return value is undefined");
					assert.equal(this.oErrorLogStub.callCount, 1, "then the changeHandler threw an error");
					assert.ok(true, "then the function resolves");
				}.bind(this));
		});

		QUnit.test("with 3 async queued changes with 1 change whose selector points to no control", function(assert) {
			var oChangePromiseSpy = sandbox.spy(this.oChange, "addChangeProcessingPromises");
			var oChangePromiseSpy2 = sandbox.spy(this.oChange2, "addChangeProcessingPromises");
			var oChangePromiseSpy4 = sandbox.spy(this.oChange4, "addChangeProcessingPromises");
			this.mChanges.mChanges[this.sLabelId] = [this.oChange, this.oChange2, this.oChange4];
			Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl);
			return this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl}])
				.then(function() {
					assert.ok(oChangePromiseSpy.called, "addChangeProcessingPromise was called");
					assert.ok(oChangePromiseSpy2.called, "addChangeProcessingPromise was called");
					assert.notOk(oChangePromiseSpy4.called, "addChangeProcessingPromise was not called");
				});
		});

		QUnit.test("with 3 async queued changes dependend on each other with an unavailable control dependency", function(assert) {
			this.mChanges.mChanges[this.sLabelId] = [this.oChange, this.oChange2, this.oChange3];
			var oChangePromiseSpy = sandbox.spy(this.oChange, "addChangeProcessingPromises");
			var oChangePromiseSpy2 = sandbox.spy(this.oChange2, "addChangeProcessingPromises");
			var oChangePromiseSpy3 = sandbox.spy(this.oChange3, "addChangeProcessingPromises");

			var oChangeHandlerApplyChangeStub = sandbox.stub().callsFake(function() {});
			this.oGetChangeHandlerStub.restore();
			this.oGetChangeHandlerStub = sandbox.stub(ChangeUtils, "getChangeHandler")
				.onCall(0).resolves({
					applyChange: oChangeHandlerApplyChangeStub
				})
				.onCall(1).resolves({
					applyChange: this.oChangeHandlerApplyChangeStub
				})
				.onCall(2).resolves({
					applyChange: this.oChangeHandlerApplyChangeStub
				});

			var mDependencies = {
				a2: {
					changeObject: this.oChange2,
					dependencies: ["a"],
					controlsDependencies: ["missingControl1"]
				},
				a3: {
					changeObject: this.oChange3,
					dependencies: ["a", "a2"]
				}
			};
			var mDependentChangesOnMe = {
				a: ["a2", "a3"],
				a2: ["a3"]
			};
			this.oChange2.addDependentControl(["missingControl1"], "combinedButtons", {
				modifier: JsControlTreeModifier,
				appComponent: new UIComponent()
			});
			this.mChanges.mChanges[this.sLabelId] = [this.oChange, this.oChange2, this.oChange3];
			this.mChanges.mDependencies = mDependencies;
			this.mChanges.mDependentChangesOnMe = mDependentChangesOnMe;

			Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl);
			return this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl}])
				.then(function() {
					assert.equal(this.oAddAppliedCustomDataSpy.callCount, 1, "addCustomData was called once");
					assert.ok(oChangePromiseSpy.called, "change was in applying state when waitForChangesToBeApplied was called");
					assert.notOk(oChangePromiseSpy2.called, "change was filtered out");
					assert.notOk(oChangePromiseSpy3.called, "change was filtered out");
				}.bind(this));
		});

		QUnit.test("with 4 async queued changes depending on one another with the last change whose selector points to no control", function(assert) {
			var done = assert.async();
			var mDependencies = {
				a2: {
					changeObject: this.oChange2,
					dependencies: ["a"]
				},
				a3: {
					changeObject: this.oChange3,
					dependencies: ["a2", "a4"]
				}
			};
			var mDependentChangesOnMe = {
				a: ["a2"],
				a2: ["a3"],
				a4: ["a3"]
			};
			this.mChanges.mChanges[this.sLabelId] = [this.oChange, this.oChange2, this.oChange3];
			this.mChanges.mChanges[this.sLabelId3] = [this.oChange4];
			this.mChanges.mDependencies = mDependencies;
			this.mChanges.mDependentChangesOnMe = mDependentChangesOnMe;

			var oChangePromiseSpy = sandbox.spy(this.oChange, "addChangeProcessingPromises");
			var oChangePromiseSpy2 = sandbox.spy(this.oChange2, "addChangeProcessingPromises");
			var oChangePromiseSpy3 = sandbox.spy(this.oChange3, "addChangeProcessingPromises");
			var oChangePromiseSpy4 = sandbox.spy(this.oChange4, "addChangeProcessingPromises");

			Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl3);
			Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl);

			this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl}])
				.then(function() {
					assert.ok(oChangePromiseSpy.called, "addChangeProcessingPromise was called");
					assert.ok(oChangePromiseSpy2.called, "addChangeProcessingPromise was called");
					assert.notOk(oChangePromiseSpy3.called, "addChangeProcessingPromise was not called");
					assert.notOk(oChangePromiseSpy4.called, "addChangeProcessingPromise was not called");
					done();
				});
		});

		QUnit.test("with 4 async queued changes depending on one another and the last change already failed", function(assert) {
			assert.expect(1);
			var mDependencies = {
				a2: {
					changeObject: this.oChange2,
					dependencies: ["a"]
				},
				a3: {
					changeObject: this.oChange3,
					dependencies: ["a2", "a5"]
				}
			};
			var mDependentChangesOnMe = {
				a: ["a2"],
				a2: ["a3"],
				a5: ["a3"]
			};
			this.mChanges.mChanges[this.sLabelId] = [this.oChange, this.oChange2, this.oChange3];
			this.mChanges.mChanges[this.sLabelId3] = [this.oChange5];
			this.mChanges.mDependencies = mDependencies;
			this.mChanges.mDependentChangesOnMe = mDependentChangesOnMe;

			Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl);
			Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl3);

			return this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl}])
				.then(function() {
					assert.equal(this.oAddAppliedCustomDataSpy.callCount, 4, "addCustomData was called 4 times");
				}.bind(this));
		});

		QUnit.test("with 3 async queued changes depending on on another with the last change failing", function(assert) {
			var mDependencies = {
				a: {
					changeObject: this.oChange,
					dependencies: ["a2"]
				},
				a2: {
					changeObject: this.oChange2,
					dependencies: ["a3"]
				}
			};
			var mDependentChangesOnMe = {
				a2: ["a"],
				a3: ["a2"]
			};
			this.mChanges.mChanges[this.sLabelId] = [this.oChange, this.oChange2];
			this.mChanges.mChanges[this.sLabelId3] = [this.oChange3];
			this.mChanges.mDependencies = mDependencies;
			this.mChanges.mDependentChangesOnMe = mDependentChangesOnMe;

			var oChangeHandlerApplyChangeRejectStub = sandbox.stub().returns(new Promise(function(fnResolve, fnReject) {
				setTimeout(function() {
					fnReject(new Error());
				}, 0);
			}));
			this.oGetChangeHandlerStub.restore();
			this.oGetChangeHandlerStub = sandbox.stub(ChangeUtils, "getChangeHandler")
				.onCall(0).resolves({
					applyChange: oChangeHandlerApplyChangeRejectStub
				})
				.onCall(1).resolves({
					applyChange: this.oChangeHandlerApplyChangeStub
				})
				.onCall(2).resolves({
					applyChange: this.oChangeHandlerApplyChangeStub
				});

			Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl3);
			Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl);

			return this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl}])
				.then(function() {
					assert.equal(this.oErrorLogStub.callCount, 1, "then the changeHandler threw an error");
					assert.equal(this.oAddAppliedCustomDataSpy.callCount, 2, "two changes were applied");
				}.bind(this));
		});

		QUnit.test("with 3 changes that will be reverted", function(assert) {
			var aChanges = [this.oChange, this.oChange2, this.oChange3];
			aChanges.forEach(function(oChange) {
				oChange.markFinished();
			});
			this.mChanges.mChanges[this.sLabelId] = aChanges;
			Reverter.revertMultipleChanges(aChanges, {
				appCOmponent: this.oComponent,
				modifier: JsControlTreeModifier,
				flexController: this.oFlexController
			});
			return this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl}])
				.then(function(oReturn) {
					assert.equal(oReturn, undefined, "the return value is undefined");
					assert.equal(this.oDestroyAppliedCustomDataSpy.callCount, 3, "all three changes got reverted");
				}.bind(this));
		});

		QUnit.test("with 2 changes that are both queued for apply and revert", function(assert) {
			var aChanges = [this.oChange, this.oChange2];
			this.mChanges.mChanges[this.sLabelId] = aChanges;

			Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl);
			Reverter.revertMultipleChanges(aChanges, {
				appCOmponent: this.oComponent,
				modifier: JsControlTreeModifier,
				flexController: this.oFlexController
			});

			return this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl}])
				.then(function() {
					assert.equal(this.oAddAppliedCustomDataSpy.callCount, 2, "two changes were applied");
					assert.equal(this.oDestroyAppliedCustomDataSpy.callCount, 2, "all two changes got reverted");
				}.bind(this));
		});

		QUnit.test("with a variant switch going on", function(assert) {
			var bCalled = false;
			this.oFlexController.setVariantSwitchPromise(new Promise(function(resolve) {
				setTimeout(function() {
					bCalled = true;
					resolve();
				});
			}));

			return this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl}])
				.then(function(oReturn) {
					assert.equal(oReturn, undefined, "the return value is undefined");
					assert.ok(bCalled, "the function waited for the variant switch");
				});
		});

		QUnit.test("with a change type filter and 3 queued changes - 1", function(assert) {
			var oChangePromiseSpy = sandbox.spy(this.oChange, "addChangeProcessingPromises");
			var oChangePromiseSpy2 = sandbox.spy(this.oChange2, "addChangeProcessingPromises");
			var oChangePromiseSpy3 = sandbox.spy(this.oChange3, "addChangeProcessingPromises");
			this.mChanges.mChanges[this.sLabelId] = [this.oChange, this.oChange2, this.oChange3];
			Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl);
			return this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl, changeTypes: ["labelChange"]}])
				.then(function() {
					assert.ok(oChangePromiseSpy.called, "addChangeProcessingPromise was called");
					assert.ok(oChangePromiseSpy2.called, "addChangeProcessingPromise was called");
					assert.notOk(oChangePromiseSpy3.called, "addChangeProcessingPromise was not called");
				});
		});

		QUnit.test("with a change type filter and 3 queued changes - 2", function(assert) {
			var oChangePromiseSpy = sandbox.spy(this.oChange, "addChangeProcessingPromises");
			var oChangePromiseSpy2 = sandbox.spy(this.oChange2, "addChangeProcessingPromises");
			var oChangePromiseSpy3 = sandbox.spy(this.oChange3, "addChangeProcessingPromises");
			this.mChanges.mChanges[this.sLabelId] = [this.oChange, this.oChange2, this.oChange3];
			Applier.applyAllChangesForControl(this.fnGetChangesMap, this.oComponent, this.oFlexController, this.oControl);
			return this.oFlexController.waitForChangesToBeApplied([{selector: this.oControl, changeTypes: ["myFancyChangeType"]}])
				.then(function() {
					assert.notOk(oChangePromiseSpy.called, "addChangeProcessingPromise was not called");
					assert.notOk(oChangePromiseSpy2.called, "addChangeProcessingPromise was not called");
					assert.ok(oChangePromiseSpy3.called, "addChangeProcessingPromise was called");
				});
		});
	});

	QUnit.done(function() {
		document.getElementById("qunit-fixture").style.display = "none";
	});
});
