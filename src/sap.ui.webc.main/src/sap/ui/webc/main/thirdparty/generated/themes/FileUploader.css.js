sap.ui.define(['sap/ui/webc/common/thirdparty/base/asset-registries/Themes', 'sap/ui/webc/common/thirdparty/theming/generated/themes/sap_fiori_3/parameters-bundle.css', './sap_fiori_3/parameters-bundle.css'], function (Themes, defaultThemeBase, parametersBundle_css) { 'use strict';

	function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e['default'] : e; }

	var defaultThemeBase__default = /*#__PURE__*/_interopDefaultLegacy(defaultThemeBase);

	Themes.registerThemePropertiesLoader("@ui5/webcomponents-theming", "sap_fiori_3", () => defaultThemeBase__default);
	Themes.registerThemePropertiesLoader("@ui5/webcomponents", "sap_fiori_3", () => parametersBundle_css);
	var FileUploaderCss = {packageName:"@ui5/webcomponents",fileName:"themes/FileUploader.css",content:":host{display:inline-block}.ui5-file-uploader-root{position:relative}.ui5-file-uploader-root input[type=file]{opacity:0;position:absolute;top:0;left:0;height:100%;width:100%}.ui5-file-uploader-root input[type=file]:not([disabled]){cursor:pointer}.ui5-file-uploader-mask{display:flex}.ui5-file-uploader-mask [ui5-input]{margin-right:.25rem}:host(:not([value-state]):not([disabled]):hover) [ui5-input],:host([value-state=None]:not([disabled]):hover) [ui5-input]{border:var(--_ui5_file_uploader_hover_border);background-color:var(--sapField_Hover_Background);box-shadow:var(--_ui5_input_hover_box_shadow)}:host([value-state=Error]:not([disabled]):hover) [ui5-input]{background-color:var(--_ui5_file_uploader_value_state_error_hover_background_color);box-shadow:var(--_ui5_input_value_state_error_hover_box_shadow)}:host([value-state=Warning]:not([disabled]):hover) [ui5-input]{background-color:var(--sapField_Hover_Background);box-shadow:var(--_ui5_input_value_state_warning_hover_box_shadow)}:host([value-state=Success]:not([disabled]):hover) [ui5-input]{background-color:var(--sapField_Hover_Background);box-shadow:var(--_ui5_input_value_state_success_hover_box_shadow)}:host([value-state=Information]:not([disabled]):hover) [ui5-input]{background-color:var(--sapField_Hover_Background);box-shadow:var(--_ui5_input_value_state_information_hover_box_shadow)}:host(:not([disabled]):active) [ui5-button]{background-color:var(--sapButton_Active_Background);border-color:var(--sapButton_Active_BorderColor);color:var(--sapButton_Active_TextColor);text-shadow:none}"};

	return FileUploaderCss;

});
