sap.ui.define(['sap/ui/webc/common/thirdparty/base/renderer/LitRenderer'], function (litRender) { 'use strict';

	const block0 = (context, tags, suffix) => litRender.html`<div class="ui5-wiz-root" aria-label="${litRender.ifDefined(context.ariaLabelText)}" role="region"><nav class="ui5-wiz-nav" aria-label="${litRender.ifDefined(context.navAriaLabelText)}" tabindex="-1"><div class="ui5-wiz-nav-list" role="list" aria-label="${litRender.ifDefined(context.listAriaLabelText)}" aria-describedby="wiz-nav-descr" aria-controls="${litRender.ifDefined(context._id)}-wiz-content">${ litRender.repeat(context._stepsInHeader, (item, index) => item._id || index, (item, index) => block1(item, index, context, tags, suffix)) }</div></nav><span id="wiz-nav-descr" class="ui5-hidden-text">${litRender.ifDefined(context.navAriaDescribedbyText)}</span><div id="${litRender.ifDefined(context._id)}-wiz-content" class="ui5-wiz-content" @scroll="${context.onScroll}">${ litRender.repeat(context._steps, (item, index) => item._id || index, (item, index) => block2(item)) }</div></div>`;
	const block1 = (item, index, context, tags, suffix) => suffix ? litRender.html`<${litRender.scopeTag("ui5-wizard-tab", tags, suffix)} title-text="${litRender.ifDefined(item.titleText)}" subtitle-text="${litRender.ifDefined(item.subtitleText)}" icon="${litRender.ifDefined(item.icon)}" number="${litRender.ifDefined(item.number)}" ?disabled="${item.disabled}" ?selected="${item.selected}" ?hide-separator="${item.hideSeparator}" ?active-separator="${item.activeSeparator}" ?branching-separator="${item.branchingSeparator}" ._wizardTabAccInfo="${litRender.ifDefined(item.accInfo)}" data-ui5-content-ref-id="${litRender.ifDefined(item.refStepId)}" data-ui5-index="${litRender.ifDefined(item.pos)}" _tab-index="${litRender.ifDefined(item.tabIndex)}" @ui5-selection-change-requested="${litRender.ifDefined(context.onSelectionChangeRequested)}" @ui5-focused="${litRender.ifDefined(context.onStepInHeaderFocused)}" @click="${context._onGroupedTabClick}" style=${litRender.styleMap(item.styles)}></${litRender.scopeTag("ui5-wizard-tab", tags, suffix)}>` : litRender.html`<ui5-wizard-tab title-text="${litRender.ifDefined(item.titleText)}" subtitle-text="${litRender.ifDefined(item.subtitleText)}" icon="${litRender.ifDefined(item.icon)}" number="${litRender.ifDefined(item.number)}" ?disabled="${item.disabled}" ?selected="${item.selected}" ?hide-separator="${item.hideSeparator}" ?active-separator="${item.activeSeparator}" ?branching-separator="${item.branchingSeparator}" ._wizardTabAccInfo="${litRender.ifDefined(item.accInfo)}" data-ui5-content-ref-id="${litRender.ifDefined(item.refStepId)}" data-ui5-index="${litRender.ifDefined(item.pos)}" _tab-index="${litRender.ifDefined(item.tabIndex)}" @ui5-selection-change-requested="${litRender.ifDefined(context.onSelectionChangeRequested)}" @ui5-focused="${litRender.ifDefined(context.onStepInHeaderFocused)}" @click="${context._onGroupedTabClick}" style=${litRender.styleMap(item.styles)}></ui5-wizard-tab>`;
	const block2 = (item, index, context, tags, suffix) => litRender.html`<div class="ui5-wiz-content-item" ?hidden="${item.disabled}" ?selected="${item.selected}" ?stretch="${item.stretch}" aria-label="${litRender.ifDefined(item.stepContentAriaLabel)}" role="region" data-ui5-content-item-ref-id="${litRender.ifDefined(item._id)}"><div class="ui5-wiz-content-item-wrapper"><slot name="${litRender.ifDefined(item._individualSlot)}"></slot></div></div>`;

	return block0;

});
