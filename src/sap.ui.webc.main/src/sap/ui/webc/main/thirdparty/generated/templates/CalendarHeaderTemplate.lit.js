sap.ui.define(['sap/ui/webc/common/thirdparty/base/renderer/LitRenderer'], function (litRender) { 'use strict';

	const block0 = (context, tags, suffix) => litRender.html`<div class="ui5-calheader-root" dir="${litRender.ifDefined(context.effectiveDir)}"><div data-ui5-cal-header-btn-prev class="${litRender.classMap(context.classes.prevButton)}" @mousedown=${context.onPrevButtonClick} title="${litRender.ifDefined(context._prevButtonText)}"><${litRender.scopeTag("ui5-icon", tags, suffix)} class="ui5-calheader-arrowicon" name="slim-arrow-left"></${litRender.scopeTag("ui5-icon", tags, suffix)}></div><div class="ui5-calheader-midcontainer"><div data-ui5-cal-header-btn-month class="ui5-calheader-arrowbtn ui5-calheader-middlebtn" ?hidden="${context.isMonthButtonHidden}" tabindex="0" aria-label="${litRender.ifDefined(context.accInfo.ariaLabelMonthButton)}" @click=${context.onMonthButtonClick} @keydown=${context.onMonthButtonKeyDown} @keyup=${context.onMonthButtonKeyUp}><span>${litRender.ifDefined(context._monthButtonText)}</span>${ context.hasSecondaryCalendarType ? block1(context) : undefined }</div><div data-ui5-cal-header-btn-year class="ui5-calheader-arrowbtn ui5-calheader-middlebtn" ?hidden="${context.isYearButtonHidden}" tabindex="0" @click=${context.onYearButtonClick} @keydown=${context.onYearButtonKeyDown} @keyup=${context.onYearButtonKeyUp}><span>${litRender.ifDefined(context._yearButtonText)}</span>${ context.hasSecondaryCalendarType ? block2(context) : undefined }</div></div><div data-ui5-cal-header-btn-next class="${litRender.classMap(context.classes.nextButton)}" @mousedown=${context.onNextButtonClick} title=${litRender.ifDefined(context._nextButtonText)}><${litRender.scopeTag("ui5-icon", tags, suffix)} class="ui5-calheader-arrowicon" name="slim-arrow-right"></${litRender.scopeTag("ui5-icon", tags, suffix)}></div></div>`;
	const block1 = (context, tags, suffix) => litRender.html`<span class="ui5-calheader-btn-sectext">${litRender.ifDefined(context._secondMonthButtonText)}</span>`;
	const block2 = (context, tags, suffix) => litRender.html`<span class="ui5-calheader-btn-sectext">${litRender.ifDefined(context._secondYearButtonText)}</span>`;

	return block0;

});