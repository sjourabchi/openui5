sap.ui.define(['sap/ui/webc/common/thirdparty/base/asset-registries/Themes', 'sap/ui/webc/common/thirdparty/theming/generated/themes/sap_fiori_3/parameters-bundle.css', './sap_fiori_3/parameters-bundle.css'], function (Themes, defaultThemeBase, parametersBundle_css) { 'use strict';

	function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e['default'] : e; }

	var defaultThemeBase__default = /*#__PURE__*/_interopDefaultLegacy(defaultThemeBase);

	Themes.registerThemePropertiesLoader("@ui5/webcomponents-theming", "sap_fiori_3", () => defaultThemeBase__default);
	Themes.registerThemePropertiesLoader("@ui5/webcomponents-fiori", "sap_fiori_3", () => parametersBundle_css);
	var SideNavigationCss = {packageName:"@ui5/webcomponents-fiori",fileName:"themes/SideNavigation.css",content:":host(:not([hidden])){display:inline-block;width:15rem;height:100%;transition:width .25s;--_ui5-tree-toggle-box-width:var(--_ui5_side_navigation_icon_padding);--_ui5_list_item_icon_size:var(--_ui5_side_navigation_icon_size);--_ui5-tree-toggle-icon-size:var(--_ui5_side_navigation_toggle_icon_size);--_ui5_list_item_title_size:var(--sapFontLargeSize);--_ui5_list_item_icon_padding-inline-end:var(--_ui5_side_navigation_icon_padding);--_ui5-tree-indent-step:var(--_ui5_side_navigation_indent_step)}:host([collapsed]){width:var(--_ui5_side_navigation_collapsed_state_width)}.ui5-sn-root{height:100%;display:flex;flex-direction:column;box-sizing:border-box;background:var(--sapList_Background);border-right:var(--sapList_BorderWidth) solid var(--sapList_GroupHeaderBorderColor);box-shadow:var(--sapContent_Shadow0)}.ui5-sn-items-tree{overflow:auto}.ui5-sn-bottom-content-border{width:100%;padding:0 1rem;margin:.25rem 0;display:flex;justify-content:center;box-sizing:border-box}:host([collapsed]) .ui5-sn-bottom-content-border{padding:0 .5rem}.ui5-sn-bottom-content-border>span{width:100%;height:.125rem;background:var(--_ui5_side_navigation_separator_backgound)}.ui5-sn-spacer{flex:1;min-height:0}[ui5-tree]::part(toggle-icon){color:var(--sapContent_NonInteractiveIconColor)}[ui5-tree]::part(icon){color:var(--_ui5_side_navigation_icon_color)}"};

	return SideNavigationCss;

});
