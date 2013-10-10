;
(function() {
	// jQuery.sap.log.setLevel('info');
	sap.ui.localResources("webimage");
	sap.ui.localResources("utils");
	sap.ui.localResources("notepad");

	jQuery.sap.require('utils.formatter');
	jQuery.sap.require("utils.storage");
	jQuery.sap.require("notepad.Panel");
	jQuery.sap.require("notepad.BreadThread");
	jQuery.sap.require("notepad.ImageItem");
	jQuery.sap.require("notepad.OverlayImage");
	jQuery.sap.require("sap.ui.commons.MessageBox");
	//get the request parameter to set image store path
	utils.storage.setImageStorePath(function() {
		sap.ui.view({
			viewName: "webimage.views.home",
			type: sap.ui.core.mvc.ViewType.XML
		}).placeAt("content");
	});

	/*********************Context Hijacking to process context***********/
	sap.ui.model.Context.prototype.getUpperContext = function(iLayer) {
		iLayer = typeof iLayer == 'number' ? iLayer : 1;
		var path = this.sPath;
		while (iLayer > 0) {
			path = path.substring(0, path.lastIndexOf('/'));
			if (!path) {
				return this.oModel.getContext('/');
			}
			iLayer--;
		}
		return this.oModel.getContext(path);
	};

	sap.ui.model.Context.prototype.getUpperObject = function(iLayer) {
		return this.getUpperContext(iLayer).getObject();
	};

	/**********************End of Hijacking*****************/
	/*********************Link Hijacking to make disabled Link control looks like a normal textview**/
	sap.ui.commons.Link.prototype.onAfterRendering = function() {
		if (!this.getEnabled()) {
			this.$().css('color', 'black');
			this.$().css('text-decoration', 'none');
		}
	};

	/*************************end Hijacking**************************/
	/***************BusyIndicator Hijacking for Gold Reflection *************/
	sap.ui.core.BusyIndicator.attachOpen(function(oEvent) {
		var theme = sap.ui.getCore().getConfiguration().getTheme();

		if (theme == "sap_goldreflection" || theme == "sap_bluecrystal") {
			// this line is a hack, the rest of this coding is what a BusyIndicator hijacker could do
			$Busy = oEvent.getParameter("$Busy");
			iBusyPageWidth = jQuery(document.body).width();
			$Busy.css("top", "0").css("width", iBusyPageWidth + "px");
			bBusyAnimate = true;
			iBusyLeft = $Busy[0].offsetLeft;
			window.setTimeout(animationStep, iBusyTimeStep);
		}
	});


	sap.ui.core.BusyIndicator.attachClose(function(oEvent) {
		bBusyAnimate = false;
	});

	var bBusyAnimate = false;
	var iBusyLeft = 0;
	var iBusyDelta = 60;
	var iBusyTimeStep = 50;
	var iBusyWidth = 500;
	var iBusyPageWidth;
	var $Busy;

	function animationStep() {
		if (bBusyAnimate) {
			iBusyLeft += iBusyDelta;
			if (iBusyLeft > iBusyPageWidth) {
				iBusyLeft = -iBusyWidth;
			}
			$Busy.css("background-position", iBusyLeft + "px 0px");
			window.setTimeout(animationStep, iBusyTimeStep);
		}
	}
	/*************** END of Hijacking for Gold Reflection *************/
})();