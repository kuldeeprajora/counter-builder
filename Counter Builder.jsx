/*
    Counter Builder
    Dockable Adobe After Effects ScriptUI panel for editable animated number counters.
*/

(function counterBuilder(thisObj) {
    var CB_VERSION = "1.0.5";
    var CB_COMMENT_MARKER = "Created by Counter Builder";
    var CB_ID_CONTROL = "Counter Builder ID";
    var CB_CONTROL_VALUE = "Counter Value";
    var CB_CONTROL_START = "Counter Start";
    var CB_CONTROL_END = "Counter End";
    var CB_CONTROL_DECIMALS = "Decimal Places";
    var CB_CONTROL_SEPARATOR = "Use Separator";
    var CB_CONTROL_FORMAT = "Number Format";

    var CB_MATCH_SLIDER = "ADBE Slider Control";
    var CB_MATCH_CHECKBOX = "ADBE Checkbox Control";
    var CB_MATCH_DROPDOWN = "ADBE Dropdown Control";

    var CB_FORMAT_INTERNATIONAL = 1;
    var CB_FORMAT_INDIAN = 2;

    var CB_DURATION_SECONDS = "Seconds";
    var CB_DURATION_FRAMES = "Frames";
    var CB_DURATION_LAYER = "Selected Layer Duration";
    var CB_DURATION_WORK_AREA = "Composition Work Area";

    var CB_LAYER_CREATE = "Create New Text Layer";
    var CB_LAYER_APPLY = "Apply to Selected Text Layer";
    var CB_LAYER_DUPLICATE = "Duplicate Selected Text Layer";

    var CB_ANIMATION_LINEAR = "Linear";
    var CB_ANIMATION_EASE_OUT = "Ease Out";
    var CB_ANIMATION_EASE_IN_OUT = "Ease In-Out";

    var CB_ALIGNMENT_LEFT = "Left";
    var CB_ALIGNMENT_CENTER = "Centre";
    var CB_ALIGNMENT_RIGHT = "Right";

    var CB_LABEL_WIDTH = 112;
    var CB_SCROLL_CONTENT_FALLBACK_HEIGHT = 780;
    var CB_SCROLL_STEP_PIXELS = 58;
    var cbUi = null;

    var CB_TOOL_CONTROL_NAMES = [
        CB_CONTROL_VALUE,
        CB_CONTROL_START,
        CB_CONTROL_END,
        CB_CONTROL_DECIMALS,
        CB_CONTROL_SEPARATOR,
        CB_CONTROL_FORMAT,
        CB_ID_CONTROL
    ];

    function cbSafeString(value) {
        if (value === undefined || value === null) {
            return "";
        }
        return String(value);
    }

    function cbTrim(value) {
        return cbSafeString(value).replace(/^\s+/, "").replace(/\s+$/, "");
    }

    function cbMakeError(message) {
        var error = new Error(message);
        error.counterBuilderUserError = true;
        return error;
    }

    function cbThrow(message) {
        throw cbMakeError(message);
    }

    function cbErrorMessage(error) {
        if (!error) {
            return "An unknown Counter Builder error occurred.";
        }
        if (error.message) {
            return error.message;
        }
        return error.toString();
    }

    function showError(message) {
        try {
            if (cbUi && cbUi.statusText) {
                cbUi.statusText.text = message;
                cbUi.window.layout.layout(true);
                updateScrollState(cbUi);
            }
        } catch (statusError) {
        }
        alert(message);
    }

    function setStatus(message) {
        try {
            if (cbUi && cbUi.statusText) {
                cbUi.statusText.text = message;
                cbUi.window.layout.layout(true);
                updateScrollState(cbUi);
            }
        } catch (statusError) {
        }
    }

    function dropdownText(dropdown) {
        if (dropdown && dropdown.selection) {
            return dropdown.selection.text;
        }
        return "";
    }

    function selectDropdownText(dropdown, text) {
        var i;
        if (!dropdown) {
            return;
        }
        for (i = 0; i < dropdown.items.length; i += 1) {
            if (dropdown.items[i].text === text) {
                dropdown.selection = dropdown.items[i];
                return;
            }
        }
        if (dropdown.items.length > 0) {
            dropdown.selection = dropdown.items[0];
        }
    }

    function parseNumberText(text) {
        var clean = cbTrim(text);
        var numberValue;
        if (!/^[-+]?(?:(?:\d+\.?\d*)|(?:\.\d+))$/.test(clean)) {
            return null;
        }
        numberValue = Number(clean);
        if (isNaN(numberValue)) {
            return null;
        }
        return numberValue;
    }

    function parseDecimalPlaces(ui) {
        var decimalText = dropdownText(ui.decimalDropdown);
        var decimalValue;
        if (decimalText === "Custom") {
            if (!/^\d+$/.test(cbTrim(ui.customDecimalsInput.text))) {
                cbThrow("Enter a valid decimal-place value.");
            }
            decimalValue = Number(cbTrim(ui.customDecimalsInput.text));
        } else {
            decimalValue = Number(decimalText);
        }
        if (isNaN(decimalValue) || decimalValue < 0 || decimalValue > 10 || Math.round(decimalValue) !== decimalValue) {
            cbThrow("Decimal places must be between 0 and 10.");
        }
        return decimalValue;
    }

    function getActiveComp() {
        var item;
        if (!app.project) {
            cbThrow("Open or select a composition first.");
        }
        item = app.project.activeItem;
        if (!(item instanceof CompItem)) {
            cbThrow("Open or select a composition first.");
        }
        return item;
    }

    function getSourceTextProperty(layer) {
        var textGroup;
        var sourceText;
        if (!layer) {
            return null;
        }
        textGroup = layer.property("ADBE Text Properties");
        if (!textGroup) {
            return null;
        }
        sourceText = textGroup.property("ADBE Text Document");
        return sourceText;
    }

    function isTextLayer(layer) {
        return getSourceTextProperty(layer) !== null;
    }

    function getSelectedTextLayer(comp) {
        var selected;
        if (!comp || comp.selectedLayers.length === 0) {
            cbThrow("Select one text layer.");
        }
        if (comp.selectedLayers.length > 1) {
            cbThrow("Select only one text layer.");
        }
        selected = comp.selectedLayers[0];
        if (!isTextLayer(selected)) {
            cbThrow("Select one text layer.");
        }
        if (selected.locked) {
            cbThrow("The selected layer is locked.");
        }
        return selected;
    }

    function getSelectedLayerForDuration(comp) {
        if (!comp || comp.selectedLayers.length === 0) {
            cbThrow("Select one layer for selected layer duration.");
        }
        if (comp.selectedLayers.length > 1) {
            cbThrow("Select only one layer for selected layer duration.");
        }
        return comp.selectedLayers[0];
    }

    function getSingleSelectedLayerForCounterAction(comp) {
        var selected;
        if (!comp || comp.selectedLayers.length === 0) {
            cbThrow("Select one text layer.");
        }
        if (comp.selectedLayers.length > 1) {
            cbThrow("Select only one text layer.");
        }
        selected = comp.selectedLayers[0];
        if (selected.locked) {
            cbThrow("The selected layer is locked.");
        }
        return selected;
    }

    function sourceTextHasExpression(layer) {
        var sourceText = getSourceTextProperty(layer);
        if (!sourceText || !sourceText.canSetExpression) {
            cbThrow("Unsupported Source Text property.");
        }
        try {
            return sourceText.expression !== "";
        } catch (expressionError) {
        }
        return false;
    }

    function getLayerMode(ui) {
        if (ui.applyLayerRadio.value) {
            return CB_LAYER_APPLY;
        }
        if (ui.duplicateLayerRadio.value) {
            return CB_LAYER_DUPLICATE;
        }
        return CB_LAYER_CREATE;
    }

    function getAnimationMode(ui) {
        if (ui.linearRadio.value) {
            return CB_ANIMATION_LINEAR;
        }
        if (ui.easeInOutRadio.value) {
            return CB_ANIMATION_EASE_IN_OUT;
        }
        return CB_ANIMATION_EASE_OUT;
    }

    function getNumberFormatMode(ui) {
        if (dropdownText(ui.numberFormatDropdown) === "Indian") {
            return CB_FORMAT_INDIAN;
        }
        return CB_FORMAT_INTERNATIONAL;
    }

    function validateInputs(ui) {
        var startValue = parseNumberText(ui.startInput.text);
        var endValue = parseNumberText(ui.endInput.text);
        var durationMode = dropdownText(ui.durationModeDropdown);
        var durationValue = 0;
        var parsedDuration;

        if (startValue === null) {
            cbThrow("Enter a valid starting value.");
        }
        if (endValue === null) {
            cbThrow("Enter a valid ending value.");
        }

        if (durationMode === CB_DURATION_SECONDS || durationMode === CB_DURATION_FRAMES) {
            parsedDuration = parseNumberText(ui.durationInput.text);
            if (parsedDuration === null || parsedDuration <= 0) {
                cbThrow("Duration must be greater than zero.");
            }
            durationValue = parsedDuration;
        }

        return {
            startValue: startValue,
            endValue: endValue,
            durationValue: durationValue,
            durationMode: durationMode,
            prefix: cbSafeString(ui.prefixInput.text),
            suffix: cbSafeString(ui.suffixInput.text),
            decimals: parseDecimalPlaces(ui),
            useSeparator: ui.thousandsCheckbox.value,
            numberFormat: getNumberFormatMode(ui),
            animationMode: getAnimationMode(ui),
            layerMode: getLayerMode(ui),
            alignment: dropdownText(ui.alignmentDropdown),
            durationReferenceLayer: null
        };
    }

    function getEffectsGroup(layer) {
        var effects = layer.property("ADBE Effect Parade");
        if (!effects) {
            cbThrow("Unsupported property: this layer cannot contain expression controls.");
        }
        return effects;
    }

    function findEffectByName(layer, name) {
        var effects = getEffectsGroup(layer);
        var i;
        var effect;
        for (i = 1; i <= effects.numProperties; i += 1) {
            effect = effects.property(i);
            if (effect && effect.name === name) {
                return effect;
            }
        }
        return null;
    }

    function isToolControlName(name) {
        var i;
        for (i = 0; i < CB_TOOL_CONTROL_NAMES.length; i += 1) {
            if (CB_TOOL_CONTROL_NAMES[i] === name) {
                return true;
            }
        }
        return false;
    }

    function ensureNoReservedControlConflicts(layer) {
        var effects = getEffectsGroup(layer);
        var i;
        var effect;
        for (i = 1; i <= effects.numProperties; i += 1) {
            effect = effects.property(i);
            if (effect && isToolControlName(effect.name)) {
                cbThrow("The selected layer already has an effect named \"" + effect.name + "\". Rename that effect before applying Counter Builder.");
            }
        }
    }

    function addOrGetEffect(layer, name, matchName, friendlyType) {
        var effects = getEffectsGroup(layer);
        var effect = findEffectByName(layer, name);
        if (effect) {
            if (effect.matchName !== matchName) {
                cbThrow("Unsupported property: \"" + name + "\" is not a " + friendlyType + ".");
            }
            return effect;
        }
        try {
            effect = effects.addProperty(matchName);
            effect.name = name;
            return effect;
        } catch (addError) {
            cbThrow("Unsupported property: could not add " + friendlyType + " \"" + name + "\".");
        }
        return null;
    }

    function addOrGetSlider(layer, name) {
        return addOrGetEffect(layer, name, CB_MATCH_SLIDER, "Slider Control");
    }

    function addOrGetCheckbox(layer, name) {
        return addOrGetEffect(layer, name, CB_MATCH_CHECKBOX, "Checkbox Control");
    }

    function configureNumberFormatDropdown(effect) {
        var menuProperty;
        if (!effect || effect.matchName !== CB_MATCH_DROPDOWN) {
            return false;
        }
        try {
            menuProperty = effect.property(1);
            if (menuProperty && menuProperty.setPropertyParameters) {
                menuProperty.setPropertyParameters(["International", "Indian"]);
                return true;
            }
        } catch (dropdownError) {
        }
        return false;
    }

    function addOrGetNumberFormatControl(layer) {
        var effects = getEffectsGroup(layer);
        var effect = findEffectByName(layer, CB_CONTROL_FORMAT);
        if (effect) {
            if (effect.matchName === CB_MATCH_DROPDOWN) {
                configureNumberFormatDropdown(effect);
                return effect;
            }
            if (effect.matchName === CB_MATCH_SLIDER) {
                return effect;
            }
            cbThrow("Unsupported property: \"Number Format\" is not a Dropdown Menu Control or Slider Control.");
        }

        try {
            effect = effects.addProperty(CB_MATCH_DROPDOWN);
            effect.name = CB_CONTROL_FORMAT;
            if (configureNumberFormatDropdown(effect)) {
                return effect;
            }
            try {
                effect.remove();
            } catch (removeDropdownError) {
            }
        } catch (dropdownAddError) {
        }

        /*
            Some AE installations cannot script Dropdown Menu Control labels reliably.
            The fallback uses Slider values: 1 = International, 2 = Indian.
        */
        try {
            effect = effects.addProperty(CB_MATCH_SLIDER);
            effect.name = CB_CONTROL_FORMAT;
            return effect;
        } catch (sliderAddError) {
            cbThrow("Unsupported property: could not add Number Format.");
        }
        return null;
    }

    function controlValueProperty(effect) {
        if (!effect || effect.numProperties < 1) {
            cbThrow("Unsupported property: expression control has no value property.");
        }
        return effect.property(1);
    }

    function setControlValue(effect, value) {
        var prop = controlValueProperty(effect);
        try {
            prop.setValue(value);
        } catch (setError) {
            cbThrow("Unsupported property: could not set \"" + effect.name + "\".");
        }
    }

    function setNumberFormatValue(layer, value) {
        var effect = addOrGetNumberFormatControl(layer);
        var prop = controlValueProperty(effect);
        if (effect.matchName === CB_MATCH_DROPDOWN) {
            configureNumberFormatDropdown(effect);
        }
        try {
            prop.setValue(value);
        } catch (setMenuError) {
            cbThrow("Unsupported property: could not set Number Format.");
        }
    }

    function getNumberFormatValue(layer) {
        var effect = findEffectByName(layer, CB_CONTROL_FORMAT);
        var value = CB_FORMAT_INTERNATIONAL;
        if (!effect) {
            return value;
        }
        try {
            value = Math.round(controlValueProperty(effect).value);
        } catch (readError) {
        }
        if (value !== CB_FORMAT_INDIAN) {
            value = CB_FORMAT_INTERNATIONAL;
        }
        return value;
    }

    function removeAllKeyframes(property) {
        while (property.numKeys > 0) {
            property.removeKey(property.numKeys);
        }
    }

    function resolveCounterTiming(comp, layer, settings) {
        var startTime;
        var endTime;
        var referenceLayer;
        if (settings.durationMode === CB_DURATION_LAYER) {
            referenceLayer = settings.durationReferenceLayer || layer;
            startTime = referenceLayer.inPoint;
            endTime = referenceLayer.outPoint;
        } else if (settings.durationMode === CB_DURATION_WORK_AREA) {
            startTime = comp.workAreaStart;
            endTime = comp.workAreaStart + comp.workAreaDuration;
        } else if (settings.durationMode === CB_DURATION_FRAMES) {
            startTime = comp.time;
            endTime = startTime + (settings.durationValue * comp.frameDuration);
        } else {
            startTime = comp.time;
            endTime = startTime + settings.durationValue;
        }

        if (endTime <= startTime) {
            cbThrow("Duration must be greater than zero.");
        }
        return {
            startTime: startTime,
            endTime: endTime,
            duration: endTime - startTime
        };
    }

    function applyCounterEasing(property, mode, startValue, endValue, duration) {
        var averageSpeed;
        var easeFast;
        var easeZeroStrong;
        var easeZeroMedium;
        var easeLinear;

        if (!property || property.numKeys < 2) {
            return;
        }

        if (mode === CB_ANIMATION_LINEAR) {
            property.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
            property.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
            return;
        }

        averageSpeed = (endValue - startValue) / Math.max(duration, 0.001);
        easeFast = new KeyframeEase(averageSpeed, 20);
        easeZeroStrong = new KeyframeEase(0, 75);
        easeZeroMedium = new KeyframeEase(0, 60);
        easeLinear = new KeyframeEase(averageSpeed, 33);

        property.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
        property.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);

        if (mode === CB_ANIMATION_EASE_IN_OUT) {
            property.setTemporalEaseAtKey(1, [easeZeroMedium], [easeZeroMedium]);
            property.setTemporalEaseAtKey(2, [easeZeroMedium], [easeZeroMedium]);
        } else {
            property.setTemporalEaseAtKey(1, [easeLinear], [easeFast]);
            property.setTemporalEaseAtKey(2, [easeZeroStrong], [easeLinear]);
        }
    }

    function setCounterKeyframes(layer, settings) {
        var comp = layer.containingComp;
        var timing = resolveCounterTiming(comp, layer, settings);
        var valueEffect = addOrGetSlider(layer, CB_CONTROL_VALUE);
        var valueProperty = controlValueProperty(valueEffect);

        removeAllKeyframes(valueProperty);
        valueProperty.setValueAtTime(timing.startTime, settings.startValue);
        valueProperty.setValueAtTime(timing.endTime, settings.endValue);
        applyCounterEasing(valueProperty, settings.animationMode, settings.startValue, settings.endValue, timing.duration);
    }

    function setCounterControlValues(layer, settings) {
        setControlValue(addOrGetSlider(layer, CB_CONTROL_START), settings.startValue);
        setControlValue(addOrGetSlider(layer, CB_CONTROL_END), settings.endValue);
        setControlValue(addOrGetSlider(layer, CB_CONTROL_DECIMALS), settings.decimals);
        setControlValue(addOrGetCheckbox(layer, CB_CONTROL_SEPARATOR), settings.useSeparator ? 1 : 0);
        setNumberFormatValue(layer, settings.numberFormat);
    }

    function markCounterLayer(layer) {
        var commentText = "";
        var idEffect;
        try {
            commentText = cbSafeString(layer.comment);
            if (commentText.indexOf(CB_COMMENT_MARKER) < 0) {
                if (commentText !== "") {
                    commentText += "\r";
                }
                commentText += CB_COMMENT_MARKER;
                layer.comment = commentText;
            }
        } catch (commentError) {
        }

        idEffect = addOrGetCheckbox(layer, CB_ID_CONTROL);
        setControlValue(idEffect, 1);
        try {
            idEffect.enabled = false;
        } catch (enableError) {
        }
    }

    function layerHasCounterMarker(layer) {
        var commentText = "";
        if (!layer) {
            return false;
        }
        try {
            commentText = cbSafeString(layer.comment);
            if (commentText.indexOf(CB_COMMENT_MARKER) >= 0) {
                return true;
            }
        } catch (commentError) {
        }
        return findEffectByName(layer, CB_ID_CONTROL) !== null;
    }

    function hasRequiredCounterControls(layer) {
        if (!findEffectByName(layer, CB_CONTROL_VALUE)) {
            return false;
        }
        if (!findEffectByName(layer, CB_CONTROL_START)) {
            return false;
        }
        if (!findEffectByName(layer, CB_CONTROL_END)) {
            return false;
        }
        if (!findEffectByName(layer, CB_CONTROL_DECIMALS)) {
            return false;
        }
        if (!findEffectByName(layer, CB_CONTROL_SEPARATOR)) {
            return false;
        }
        if (!findEffectByName(layer, CB_CONTROL_FORMAT)) {
            return false;
        }
        return true;
    }

    function isCounterBuilderLayer(layer) {
        if (!layer || !isTextLayer(layer)) {
            return false;
        }
        return layerHasCounterMarker(layer) && hasRequiredCounterControls(layer);
    }

    function readCounterSettingsFromLayer(layer) {
        var settings = {
            startValue: 0,
            endValue: 100,
            decimals: 0,
            useSeparator: true,
            numberFormat: CB_FORMAT_INTERNATIONAL
        };
        try {
            settings.startValue = controlValueProperty(findEffectByName(layer, CB_CONTROL_START)).value;
            settings.endValue = controlValueProperty(findEffectByName(layer, CB_CONTROL_END)).value;
            settings.decimals = Math.round(controlValueProperty(findEffectByName(layer, CB_CONTROL_DECIMALS)).value);
            settings.useSeparator = controlValueProperty(findEffectByName(layer, CB_CONTROL_SEPARATOR)).value === 1;
            settings.numberFormat = getNumberFormatValue(layer);
        } catch (readError) {
        }
        return settings;
    }

    function escapeExpressionString(value) {
        var text = cbSafeString(value);
        text = text.replace(/\\/g, "\\\\");
        text = text.replace(/"/g, "\\\"");
        text = text.replace(/\r/g, "\\r");
        text = text.replace(/\n/g, "\\n");
        text = text.replace(/\u2028/g, "\\u2028");
        text = text.replace(/\u2029/g, "\\u2029");
        return text;
    }

    function createCounterExpression(settings) {
        var prefix = escapeExpressionString(settings.prefix);
        var suffix = escapeExpressionString(settings.suffix);
        var lines = [];

        lines.push('function readSlider(name, fallbackValue) {');
        lines.push('    try {');
        lines.push('        return effect(name)("Slider");');
        lines.push('    } catch (readError) {');
        lines.push('        return fallbackValue;');
        lines.push('    }');
        lines.push('}');
        lines.push('');
        lines.push('function readCheckbox(name, fallbackValue) {');
        lines.push('    try {');
        lines.push('        return effect(name)("Checkbox") == 1;');
        lines.push('    } catch (readError) {');
        lines.push('        return fallbackValue;');
        lines.push('    }');
        lines.push('}');
        lines.push('');
        lines.push('function readNumberFormat() {');
        lines.push('    var result = 1;');
        lines.push('    try {');
        lines.push('        result = effect("Number Format")("Menu").value;');
        lines.push('    } catch (menuError) {');
        lines.push('        try {');
        lines.push('            result = effect("Number Format")("Slider");');
        lines.push('        } catch (sliderError) {');
        lines.push('            result = 1;');
        lines.push('        }');
        lines.push('    }');
        lines.push('    result = Math.round(Number(result));');
        lines.push('    if (result != 2) {');
        lines.push('        result = 1;');
        lines.push('    }');
        lines.push('    return result;');
        lines.push('}');
        lines.push('');
        lines.push('function groupInternational(numberText) {');
        lines.push('    var result = "";');
        lines.push('    var index = numberText.length;');
        lines.push('    while (index > 3) {');
        lines.push('        result = "," + numberText.substring(index - 3, index) + result;');
        lines.push('        index -= 3;');
        lines.push('    }');
        lines.push('    return numberText.substring(0, index) + result;');
        lines.push('}');
        lines.push('');
        lines.push('function groupIndian(numberText) {');
        lines.push('    var length = numberText.length;');
        lines.push('    var lastThree;');
        lines.push('    var rest;');
        lines.push('    var result = "";');
        lines.push('    if (length <= 3) {');
        lines.push('        return numberText;');
        lines.push('    }');
        lines.push('    lastThree = numberText.substring(length - 3);');
        lines.push('    rest = numberText.substring(0, length - 3);');
        lines.push('    while (rest.length > 2) {');
        lines.push('        result = "," + rest.substring(rest.length - 2) + result;');
        lines.push('        rest = rest.substring(0, rest.length - 2);');
        lines.push('    }');
        lines.push('    if (rest.length > 0) {');
        lines.push('        result = rest + result;');
        lines.push('    } else if (result.length > 0 && result.charAt(0) == ",") {');
        lines.push('        result = result.substring(1);');
        lines.push('    }');
        lines.push('    return result + "," + lastThree;');
        lines.push('}');
        lines.push('');
        lines.push('function formatCounterNumber(inputValue, decimals, useSeparator, formatMode) {');
        lines.push('    var numericValue = Number(inputValue);');
        lines.push('    var negative = numericValue < 0;');
        lines.push('    var absoluteValue = Math.abs(numericValue);');
        lines.push('    var fixedText;');
        lines.push('    var parts;');
        lines.push('    var wholeText;');
        lines.push('    var decimalText = "";');
        lines.push('    if (isNaN(absoluteValue)) {');
        lines.push('        absoluteValue = 0;');
        lines.push('        negative = false;');
        lines.push('    }');
        lines.push('    decimals = Math.round(Number(decimals));');
        lines.push('    if (isNaN(decimals) || decimals < 0) {');
        lines.push('        decimals = 0;');
        lines.push('    }');
        lines.push('    if (decimals > 10) {');
        lines.push('        decimals = 10;');
        lines.push('    }');
        lines.push('    fixedText = absoluteValue.toFixed(decimals);');
        lines.push('    parts = fixedText.split(".");');
        lines.push('    wholeText = parts[0];');
        lines.push('    if (parts.length > 1) {');
        lines.push('        decimalText = "." + parts[1];');
        lines.push('    }');
        lines.push('    if (useSeparator) {');
        lines.push('        if (formatMode == 2) {');
        lines.push('            wholeText = groupIndian(wholeText);');
        lines.push('        } else {');
        lines.push('            wholeText = groupInternational(wholeText);');
        lines.push('        }');
        lines.push('    }');
        lines.push('    return (negative ? "-" : "") + "' + prefix + '" + wholeText + decimalText + "' + suffix + '";');
        lines.push('}');
        lines.push('');
        lines.push('var value = readSlider("Counter Value", 0);');
        lines.push('var decimals = readSlider("Decimal Places", ' + String(settings.decimals) + ');');
        lines.push('var useSeparator = readCheckbox("Use Separator", ' + (settings.useSeparator ? "true" : "false") + ');');
        lines.push('var formatMode = readNumberFormat();');
        lines.push('formatCounterNumber(value, decimals, useSeparator, formatMode);');

        return lines.join("\r");
    }

    function setSourceTextExpression(layer, settings) {
        var sourceText = getSourceTextProperty(layer);
        var expressionText;
        if (!sourceText || !sourceText.canSetExpression) {
            cbThrow("Unsupported Source Text property.");
        }
        expressionText = createCounterExpression(settings);
        try {
            sourceText.expression = expressionText;
            sourceText.expressionEnabled = true;
        } catch (expressionSetError) {
            cbThrow("Unsupported property: could not apply the Source Text expression.");
        }
        try {
            if (sourceText.expressionError && sourceText.expressionError !== "") {
                cbThrow("Source Text expression error: " + sourceText.expressionError);
            }
        } catch (expressionReadError) {
        }
    }

    function setParagraphJustification(textDocument, alignment) {
        if (!textDocument) {
            return;
        }
        try {
            if (alignment === CB_ALIGNMENT_LEFT) {
                textDocument.justification = ParagraphJustification.LEFT_JUSTIFY;
            } else if (alignment === CB_ALIGNMENT_CENTER) {
                textDocument.justification = ParagraphJustification.CENTER_JUSTIFY;
            } else {
                textDocument.justification = ParagraphJustification.RIGHT_JUSTIFY;
            }
        } catch (justificationError) {
        }
    }

    function applyDefaultTextStyle(layer, settings) {
        var sourceText = getSourceTextProperty(layer);
        var textDocument;
        if (!sourceText) {
            return;
        }
        try {
            textDocument = sourceText.value;
            textDocument.text = formatCounterText(settings, settings.startValue);
            textDocument.fontSize = 96;
            textDocument.fillColor = [1, 1, 1];
            setParagraphJustification(textDocument, settings.alignment);
            sourceText.setValue(textDocument);
        } catch (styleError) {
        }
    }

    function formatWholeInternational(numberText) {
        var result = "";
        var index = numberText.length;
        while (index > 3) {
            result = "," + numberText.substring(index - 3, index) + result;
            index -= 3;
        }
        return numberText.substring(0, index) + result;
    }

    function formatWholeIndian(numberText) {
        var length = numberText.length;
        var lastThree;
        var rest;
        var result = "";
        if (length <= 3) {
            return numberText;
        }
        lastThree = numberText.substring(length - 3);
        rest = numberText.substring(0, length - 3);
        while (rest.length > 2) {
            result = "," + rest.substring(rest.length - 2) + result;
            rest = rest.substring(0, rest.length - 2);
        }
        if (rest.length > 0) {
            result = rest + result;
        } else if (result.length > 0 && result.charAt(0) === ",") {
            result = result.substring(1);
        }
        return result + "," + lastThree;
    }

    function formatCounterText(settings, value) {
        var decimals = Math.max(0, Math.min(10, Math.round(settings.decimals)));
        var numericValue = Number(value);
        var negative = numericValue < 0;
        var absoluteValue = Math.abs(numericValue);
        var fixedText;
        var parts;
        var wholeText;
        var decimalText = "";
        if (isNaN(absoluteValue)) {
            absoluteValue = 0;
            negative = false;
        }
        fixedText = absoluteValue.toFixed(decimals);
        parts = fixedText.split(".");
        wholeText = parts[0];
        if (parts.length > 1) {
            decimalText = "." + parts[1];
        }
        if (settings.useSeparator) {
            if (settings.numberFormat === CB_FORMAT_INDIAN) {
                wholeText = formatWholeIndian(wholeText);
            } else {
                wholeText = formatWholeInternational(wholeText);
            }
        }
        return (negative ? "-" : "") + cbSafeString(settings.prefix) + wholeText + decimalText + cbSafeString(settings.suffix);
    }

    function sanitizeLayerNameText(text) {
        return cbSafeString(text).replace(/[\r\n\t]/g, " ").replace(/\s+/g, " ");
    }

    function limitLayerName(text) {
        var clean = sanitizeLayerNameText(text);
        if (clean.length > 60) {
            clean = clean.substring(0, 57) + "...";
        }
        return clean;
    }

    function makeCounterLayerName(settings) {
        return limitLayerName("Counter - " + formatCounterText(settings, settings.startValue) + " to " + formatCounterText(settings, settings.endValue));
    }

    function centerLayerInComp(layer, comp) {
        var transformGroup;
        var positionProperty;
        try {
            transformGroup = layer.property("ADBE Transform Group");
            positionProperty = transformGroup.property("ADBE Position");
            if (positionProperty && !positionProperty.expressionEnabled) {
                positionProperty.setValue([comp.width / 2, comp.height / 2]);
            }
        } catch (positionError) {
        }
    }

    function applyCounterToLayer(layer, settings, options) {
        options = options || {};
        if (!layer || !isTextLayer(layer)) {
            cbThrow("Select one text layer.");
        }
        if (layer.locked) {
            cbThrow("The selected layer is locked.");
        }
        if (options.stopOnExistingExpression && sourceTextHasExpression(layer)) {
            cbThrow("The selected text layer already has a Source Text expression.\rRemove it before applying Counter Builder.");
        }
        if (options.checkReservedConflicts) {
            ensureNoReservedControlConflicts(layer);
        }

        markCounterLayer(layer);
        addOrGetSlider(layer, CB_CONTROL_VALUE);
        setCounterControlValues(layer, settings);
        setCounterKeyframes(layer, settings);
        setSourceTextExpression(layer, settings);
        return layer;
    }

    function createCounter(comp, settings) {
        var layer = comp.layers.addText("");
        layer.name = makeCounterLayerName(settings);
        centerLayerInComp(layer, comp);
        applyDefaultTextStyle(layer, settings);
        applyCounterToLayer(layer, settings, {
            stopOnExistingExpression: false,
            checkReservedConflicts: false
        });
        layer.selected = true;
        return layer;
    }

    function duplicateAndApplyCounter(layer, settings) {
        var duplicateLayer = layer.duplicate();
        duplicateLayer.name = "Counter - Copy";
        duplicateLayer.selected = true;
        layer.selected = false;
        applyCounterToLayer(duplicateLayer, settings, {
            stopOnExistingExpression: false,
            checkReservedConflicts: !isCounterBuilderLayer(duplicateLayer)
        });
        return duplicateLayer;
    }

    function updateSelectedCounter(settings) {
        var comp = getActiveComp();
        var layer = getSingleSelectedLayerForCounterAction(comp);
        if (!isCounterBuilderLayer(layer)) {
            cbThrow("The selected layer was not created by Counter Builder.");
        }
        readCounterSettingsFromLayer(layer);
        applyCounterToLayer(layer, settings, {
            stopOnExistingExpression: false,
            checkReservedConflicts: false
        });
        return layer;
    }

    function valueToText(value) {
        try {
            if (value && value.text !== undefined) {
                return cbSafeString(value.text);
            }
        } catch (textError) {
        }
        return cbSafeString(value);
    }

    function getCurrentDisplayedText(layer) {
        var sourceText = getSourceTextProperty(layer);
        var comp = layer.containingComp;
        var sampledValue;
        if (!sourceText) {
            return "";
        }
        try {
            sampledValue = sourceText.valueAtTime(comp.time, false);
            return valueToText(sampledValue);
        } catch (valueAtTimeError) {
        }
        try {
            return valueToText(sourceText.value);
        } catch (valueError) {
        }
        return "";
    }

    function setSourceTextToPlainText(layer, text) {
        var sourceText = getSourceTextProperty(layer);
        var textDocument;
        if (!sourceText) {
            return;
        }
        try {
            textDocument = sourceText.value;
        } catch (docError) {
            textDocument = new TextDocument(text);
        }
        try {
            if (sourceText.canSetExpression) {
                sourceText.expression = "";
            }
        } catch (expressionClearError) {
        }
        try {
            textDocument.text = text;
            sourceText.setValue(textDocument);
        } catch (setTextError) {
            cbThrow("Unsupported property: could not preserve the current counter text.");
        }
    }

    function removeCounterControls(layer) {
        var effects = getEffectsGroup(layer);
        var i;
        var effect;
        for (i = effects.numProperties; i >= 1; i -= 1) {
            effect = effects.property(i);
            if (effect && isToolControlName(effect.name)) {
                effect.remove();
            }
        }
    }

    function removeCounterMarker(layer) {
        var commentText;
        var markerIndex;
        try {
            commentText = cbSafeString(layer.comment);
            markerIndex = commentText.indexOf(CB_COMMENT_MARKER);
            if (markerIndex >= 0) {
                commentText = commentText.substring(0, markerIndex) + commentText.substring(markerIndex + CB_COMMENT_MARKER.length);
                commentText = commentText.replace(/\r\r/g, "\r").replace(/^\r+/, "").replace(/\r+$/, "");
                layer.comment = commentText;
            }
        } catch (commentError) {
        }
    }

    function removeCounterSetup() {
        var comp = getActiveComp();
        var layer = getSingleSelectedLayerForCounterAction(comp);
        var displayedText;
        if (!isCounterBuilderLayer(layer)) {
            cbThrow("The selected layer was not created by Counter Builder.");
        }
        displayedText = getCurrentDisplayedText(layer);
        setSourceTextToPlainText(layer, displayedText);
        removeCounterControls(layer);
        removeCounterMarker(layer);
        return layer;
    }

    function handleCreateCounter(ui) {
        var comp;
        var settings;
        var selectedLayer;
        var resultLayer;
        try {
            comp = getActiveComp();
            settings = validateInputs(ui);

            if (settings.layerMode === CB_LAYER_CREATE && settings.durationMode === CB_DURATION_LAYER) {
                settings.durationReferenceLayer = getSelectedLayerForDuration(comp);
            }

            if (settings.layerMode === CB_LAYER_APPLY) {
                selectedLayer = getSelectedTextLayer(comp);
                if (sourceTextHasExpression(selectedLayer)) {
                    cbThrow("The selected text layer already has a Source Text expression.\rRemove it before applying Counter Builder.");
                }
                if (!isCounterBuilderLayer(selectedLayer)) {
                    ensureNoReservedControlConflicts(selectedLayer);
                }
            }

            if (settings.layerMode === CB_LAYER_DUPLICATE) {
                selectedLayer = getSelectedTextLayer(comp);
                if (!isCounterBuilderLayer(selectedLayer)) {
                    ensureNoReservedControlConflicts(selectedLayer);
                }
            }

            app.beginUndoGroup("Create Counter");
            try {
                if (settings.layerMode === CB_LAYER_APPLY) {
                    resultLayer = applyCounterToLayer(selectedLayer, settings, {
                        stopOnExistingExpression: true,
                        checkReservedConflicts: false
                    });
                } else if (settings.layerMode === CB_LAYER_DUPLICATE) {
                    resultLayer = duplicateAndApplyCounter(selectedLayer, settings);
                } else {
                    resultLayer = createCounter(comp, settings);
                }
            } finally {
                app.endUndoGroup();
            }

            setStatus("Created counter: " + resultLayer.name);
        } catch (error) {
            showError(cbErrorMessage(error));
        }
    }

    function handleUpdateCounter(ui) {
        var settings;
        var layer;
        try {
            getActiveComp();
            settings = validateInputs(ui);
            app.beginUndoGroup("Update Counter");
            try {
                layer = updateSelectedCounter(settings);
            } finally {
                app.endUndoGroup();
            }
            setStatus("Updated counter: " + layer.name);
        } catch (error) {
            showError(cbErrorMessage(error));
        }
    }

    function handleRemoveCounter() {
        var layer;
        try {
            getActiveComp();
            app.beginUndoGroup("Remove Counter Setup");
            try {
                layer = removeCounterSetup();
            } finally {
                app.endUndoGroup();
            }
            setStatus("Removed counter setup from: " + layer.name);
        } catch (error) {
            showError(cbErrorMessage(error));
        }
    }

    function addLabeledEdit(parent, labelText, defaultText, characters) {
        var row = parent.add("group");
        var label;
        var edit;
        row.orientation = "row";
        row.alignChildren = ["fill", "center"];
        row.alignment = ["fill", "top"];
        label = row.add("statictext", undefined, labelText);
        label.preferredSize.width = CB_LABEL_WIDTH;
        edit = row.add("edittext", undefined, defaultText);
        edit.characters = characters || 10;
        edit.alignment = ["fill", "center"];
        return edit;
    }

    function addDropdownRow(parent, labelText, options, selectedIndex) {
        var row = parent.add("group");
        var label;
        var dropdown;
        row.orientation = "row";
        row.alignChildren = ["fill", "center"];
        row.alignment = ["fill", "top"];
        label = row.add("statictext", undefined, labelText);
        label.preferredSize.width = CB_LABEL_WIDTH;
        dropdown = row.add("dropdownlist", undefined, options);
        dropdown.alignment = ["fill", "center"];
        dropdown.selection = dropdown.items[selectedIndex || 0];
        return dropdown;
    }

    function updateControlStates(ui) {
        var durationMode = dropdownText(ui.durationModeDropdown);
        var usesNumericDuration = durationMode === CB_DURATION_SECONDS || durationMode === CB_DURATION_FRAMES;
        var usesCustomDecimals = dropdownText(ui.decimalDropdown) === "Custom";
        var createMode = ui.createLayerRadio.value;

        ui.durationInput.enabled = usesNumericDuration;
        ui.customDecimalsInput.enabled = usesCustomDecimals;
        ui.alignmentDropdown.enabled = createMode;
        ui.alignmentLabel.enabled = createMode;

        try {
            ui.window.layout.layout(true);
            ui.window.layout.resize();
            updateScrollState(ui);
        } catch (layoutError) {
        }
    }

    function readDimensionValue(dimension, name) {
        var value = 0;
        try {
            if (dimension && dimension[name] !== undefined) {
                value = Number(dimension[name]);
            }
        } catch (dimensionError) {
            value = 0;
        }
        if (isNaN(value)) {
            value = 0;
        }
        return value;
    }

    function readControlBottom(control) {
        var bottom = 0;
        try {
            if (control && control.bounds && control.bounds.bottom !== undefined) {
                bottom = Number(control.bounds.bottom);
            }
        } catch (boundsError) {
            bottom = 0;
        }
        if (isNaN(bottom) || bottom <= 0) {
            bottom = readDimensionValue(control.location, "y") + readDimensionValue(control.size, "height");
        }
        return bottom;
    }

    function readChildrenContentHeight(group) {
        var height = 0;
        var i;
        var bottom;
        if (!group || !group.children) {
            return 0;
        }
        for (i = 0; i < group.children.length; i += 1) {
            bottom = readControlBottom(group.children[i]);
            if (bottom > height) {
                height = bottom;
            }
        }
        return height;
    }

    function readVerticalMargins(control) {
        var margins;
        var value = 0;
        try {
            margins = control.margins;
            if (typeof margins === "number") {
                value = Number(margins) * 2;
            } else if (margins && margins.length && margins.length > 3) {
                value = Number(margins[1]) + Number(margins[3]);
            }
        } catch (marginError) {
            value = 0;
        }
        if (isNaN(value)) {
            value = 0;
        }
        return value;
    }

    function readGroupSpacing(group) {
        var spacing = 0;
        try {
            spacing = Number(group.spacing);
        } catch (spacingError) {
            spacing = 0;
        }
        if (isNaN(spacing) || spacing < 0) {
            spacing = 0;
        }
        return spacing;
    }

    function estimateControlHeight(control) {
        var height = 0;
        if (!control) {
            return 0;
        }
        height = readDimensionValue(control.preferredSize, "height");
        if (height <= 0) {
            height = readDimensionValue(control.size, "height");
        }
        if (height <= 0) {
            height = readDimensionValue(control.minimumSize, "height");
        }
        if (height <= 0 && control.children) {
            height = estimateColumnContentHeight(control);
        }
        return height;
    }

    function estimateColumnContentHeight(group) {
        var height = 0;
        var spacing;
        var i;
        if (!group || !group.children) {
            return 0;
        }
        spacing = readGroupSpacing(group);
        for (i = 0; i < group.children.length; i += 1) {
            height += estimateControlHeight(group.children[i]);
            if (i > 0) {
                height += spacing;
            }
        }
        return height + readVerticalMargins(group);
    }

    function setScrollPosition(ui, value) {
        var maxValue;
        if (!ui || !ui.scrollbar || !ui.scrollContent) {
            return;
        }
        maxValue = Number(ui.scrollbar.maxvalue);
        if (isNaN(maxValue) || maxValue < 0) {
            maxValue = 0;
        }
        value = Number(value);
        if (isNaN(value) || value < 0) {
            value = 0;
        }
        if (value > maxValue) {
            value = maxValue;
        }
        try {
            ui.scrollbar.value = value;
            ui.scrollContent.location = [0, -value];
        } catch (scrollError) {
        }
    }

    function scrollByAmount(ui, amount) {
        if (!ui || !ui.scrollbar) {
            return;
        }
        updateScrollState(ui);
        setScrollPosition(ui, ui.scrollbar.value + amount);
    }

    function applyScrollContentSize(ui, contentHeight) {
        var viewportWidth;
        if (!ui || !ui.scrollViewport || !ui.scrollContent) {
            return;
        }
        viewportWidth = readDimensionValue(ui.scrollViewport.size, "width");
        if (viewportWidth <= 0) {
            viewportWidth = readDimensionValue(ui.scrollViewport.preferredSize, "width");
        }
        if (viewportWidth <= 0) {
            viewportWidth = readDimensionValue(ui.scrollContent.size, "width");
        }
        if (viewportWidth <= 0) {
            viewportWidth = 240;
        }
        try {
            ui.scrollContent.preferredSize = [viewportWidth, contentHeight];
            ui.scrollContent.size = [viewportWidth, contentHeight];
        } catch (sizeError) {
            try {
                ui.scrollContent.preferredSize.height = contentHeight;
                ui.scrollContent.size.height = contentHeight;
            } catch (heightError) {
            }
        }
    }

    function updateScrollState(ui) {
        var viewportHeight;
        var contentHeight;
        var preferredHeight;
        var childrenHeight;
        var fallbackHeight;
        var maxScroll;
        var stepSize;
        if (!ui || !ui.scrollViewport || !ui.scrollContent || !ui.scrollbar) {
            return;
        }
        try {
            ui.scrollContent.layout.layout(true);
        } catch (contentLayoutError) {
        }
        viewportHeight = readDimensionValue(ui.scrollViewport.size, "height");
        contentHeight = readDimensionValue(ui.scrollContent.size, "height");
        preferredHeight = readDimensionValue(ui.scrollContent.preferredSize, "height");
        childrenHeight = readChildrenContentHeight(ui.scrollContent) + 8;
        fallbackHeight = ui.scrollContentFallbackHeight || CB_SCROLL_CONTENT_FALLBACK_HEIGHT;
        if (preferredHeight > contentHeight) {
            contentHeight = preferredHeight;
        }
        if (childrenHeight > contentHeight) {
            contentHeight = childrenHeight;
        }
        if (fallbackHeight > contentHeight) {
            contentHeight = fallbackHeight;
        }
        applyScrollContentSize(ui, contentHeight);
        maxScroll = Math.max(0, contentHeight - viewportHeight + 4);
        stepSize = Math.max(CB_SCROLL_STEP_PIXELS, Math.round(viewportHeight / 5));
        try {
            ui.scrollbar.minvalue = 0;
            ui.scrollbar.maxvalue = maxScroll;
            ui.scrollbar.stepdelta = stepSize;
            ui.scrollbar.jumpdelta = Math.max(stepSize * 3, Math.round(viewportHeight * 0.8));
            ui.scrollbar.enabled = maxScroll > 1;
            if (ui.scrollUpButton) {
                ui.scrollUpButton.enabled = maxScroll > 1;
            }
            if (ui.scrollDownButton) {
                ui.scrollDownButton.enabled = maxScroll > 1;
            }
        } catch (scrollbarError) {
        }
        setScrollPosition(ui, ui.scrollbar.value);
    }

    function getMouseWheelScrollAmount(ui, event) {
        var stepSize = 24;
        var wheelValue = 0;
        try {
            if (ui && ui.scrollbar && ui.scrollbar.stepdelta) {
                stepSize = Number(ui.scrollbar.stepdelta);
            }
        } catch (stepError) {
        }
        if (isNaN(stepSize) || stepSize <= 0) {
            stepSize = CB_SCROLL_STEP_PIXELS;
        }

        try {
            if (event && event.wheelDelta !== undefined && event.wheelDelta !== 0) {
                wheelValue = Number(event.wheelDelta);
            }
        } catch (wheelDeltaError) {
        }
        try {
            if (wheelValue === 0 && event && event.detail !== undefined && event.detail !== 0) {
                wheelValue = -Number(event.detail);
            }
        } catch (detailError) {
        }
        try {
            if (wheelValue === 0 && event && event.deltaY !== undefined && event.deltaY !== 0) {
                wheelValue = -Number(event.deltaY);
            }
        } catch (deltaYError) {
        }

        if (isNaN(wheelValue) || wheelValue === 0) {
            return stepSize;
        }
        return wheelValue > 0 ? -stepSize : stepSize;
    }

    function handleMouseWheelScroll(ui, event) {
        var amount;
        updateScrollState(ui);
        amount = getMouseWheelScrollAmount(ui, event);
        setScrollPosition(ui, ui.scrollbar.value + amount);
        try {
            if (event && event.preventDefault) {
                event.preventDefault();
            }
        } catch (preventError) {
        }
        try {
            if (event && event.stopPropagation) {
                event.stopPropagation();
            }
        } catch (propagationError) {
        }
        return false;
    }

    function readEventY(event) {
        var value = null;
        try {
            if (event && event.screenY !== undefined) {
                value = Number(event.screenY);
            }
        } catch (screenError) {
            value = null;
        }
        try {
            if ((value === null || isNaN(value)) && event && event.clientY !== undefined) {
                value = Number(event.clientY);
            }
        } catch (clientError) {
            value = null;
        }
        try {
            if ((value === null || isNaN(value)) && event && event.y !== undefined) {
                value = Number(event.y);
            }
        } catch (localError) {
            value = null;
        }
        if (value === null || isNaN(value)) {
            return null;
        }
        return value;
    }

    function stopUiEvent(event) {
        try {
            if (event && event.preventDefault) {
                event.preventDefault();
            }
        } catch (preventError) {
        }
        try {
            if (event && event.stopPropagation) {
                event.stopPropagation();
            }
        } catch (propagationError) {
        }
    }

    function beginDragScroll(ui, event) {
        var y = readEventY(event);
        if (y === null || !ui || !ui.scrollbar || !ui.scrollbar.enabled) {
            return true;
        }
        ui.scrollDragActive = true;
        ui.scrollDragStartY = y;
        ui.scrollDragStartValue = ui.scrollbar.value;
        stopUiEvent(event);
        return false;
    }

    function moveDragScroll(ui, event) {
        var y;
        var delta;
        if (!ui || !ui.scrollDragActive) {
            return true;
        }
        y = readEventY(event);
        if (y === null) {
            return false;
        }
        delta = ui.scrollDragStartY - y;
        setScrollPosition(ui, ui.scrollDragStartValue + delta);
        stopUiEvent(event);
        return false;
    }

    function endDragScroll(ui, event) {
        if (ui) {
            ui.scrollDragActive = false;
        }
        stopUiEvent(event);
        return false;
    }

    function canAttachDragScroll(control) {
        var controlType = "";
        try {
            controlType = cbSafeString(control.type);
        } catch (typeError) {
            controlType = "";
        }
        if (controlType === "edittext" || controlType === "dropdownlist" || controlType === "button" || controlType === "scrollbar") {
            return false;
        }
        if (controlType === "checkbox" || controlType === "radiobutton") {
            return false;
        }
        return true;
    }

    function attachDragScroll(control, ui) {
        var i;
        if (!control) {
            return;
        }
        if (canAttachDragScroll(control)) {
            try {
                control.addEventListener("mousedown", function (event) {
                    return beginDragScroll(ui, event);
                });
            } catch (mouseDownError) {
            }
            try {
                control.addEventListener("mousemove", function (event) {
                    return moveDragScroll(ui, event);
                });
            } catch (mouseMoveError) {
            }
            try {
                control.addEventListener("mouseup", function (event) {
                    return endDragScroll(ui, event);
                });
            } catch (mouseUpError) {
            }
            try {
                control.onMouseDown = function (event) {
                    return beginDragScroll(ui, event);
                };
                control.onMouseMove = function (event) {
                    return moveDragScroll(ui, event);
                };
                control.onMouseUp = function (event) {
                    return endDragScroll(ui, event);
                };
            } catch (mouseCallbackError) {
            }
        }
        try {
            if (control.children) {
                for (i = 0; i < control.children.length; i += 1) {
                    attachDragScroll(control.children[i], ui);
                }
            }
        } catch (childrenError) {
        }
    }

    function attachMouseWheelScroll(control, ui) {
        var i;
        var eventNames = ["mousewheel", "wheel", "scrollwheel"];
        if (!control) {
            return;
        }
        for (i = 0; i < eventNames.length; i += 1) {
            try {
                control.addEventListener(eventNames[i], function (event) {
                    return handleMouseWheelScroll(ui, event);
                });
            } catch (listenerError) {
            }
        }
        try {
            control.onMouseWheel = function (event) {
                return handleMouseWheelScroll(ui, event);
            };
        } catch (callbackError) {
        }
        try {
            control.onWheel = function (event) {
                return handleMouseWheelScroll(ui, event);
            };
        } catch (wheelCallbackError) {
        }
        try {
            if (control.children) {
                for (i = 0; i < control.children.length; i += 1) {
                    attachMouseWheelScroll(control.children[i], ui);
                }
            }
        } catch (childrenError) {
        }
    }

    function buildRadioPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = ["left", "top"];
        panel.alignment = ["fill", "top"];
        panel.margins = [10, 12, 10, 10];
        panel.spacing = 4;
        return panel;
    }

    function buildUI(thisObject) {
        var win = (thisObject instanceof Panel) ? thisObject : new Window("palette", "Counter Builder", undefined, { resizeable: true });
        var title;
        var scrollShell;
        var scrollViewport;
        var scrollContent;
        var scrollControls;
        var scrollUpButton;
        var scrollDownButton;
        var scrollbar;
        var durationRow;
        var durationLabel;
        var durationInput;
        var durationDropdown;
        var decimalRow;
        var decimalLabel;
        var decimalDropdown;
        var customDecimalsInput;
        var alignmentRow;
        var alignmentLabel;
        var alignmentDropdown;
        var animationPanel;
        var layerPanel;
        var buttonGroup;
        var statusText;
        var ui;

        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.margins = [10, 10, 10, 10];
        win.spacing = 7;
        win.minimumSize = [260, 220];

        title = win.add("statictext", undefined, "COUNTER BUILDER");
        title.alignment = ["fill", "top"];
        title.justify = "center";
        title.preferredSize.height = 18;
        title.maximumSize.height = 22;

        scrollShell = win.add("group");
        scrollShell.orientation = "row";
        scrollShell.alignChildren = ["fill", "fill"];
        scrollShell.alignment = ["fill", "fill"];
        scrollShell.margins = 0;
        scrollShell.spacing = 4;
        scrollShell.minimumSize.height = 120;
        scrollShell.preferredSize.height = 360;

        scrollViewport = scrollShell.add("group");
        scrollViewport.orientation = "stack";
        scrollViewport.alignChildren = ["fill", "top"];
        scrollViewport.alignment = ["fill", "fill"];
        scrollViewport.minimumSize.height = 100;
        scrollViewport.preferredSize.height = 360;

        scrollContent = scrollViewport.add("group");
        scrollContent.orientation = "column";
        scrollContent.alignChildren = ["fill", "top"];
        scrollContent.alignment = ["fill", "top"];
        scrollContent.margins = [0, 0, 2, 0];
        scrollContent.spacing = 7;
        scrollContent.preferredSize.height = CB_SCROLL_CONTENT_FALLBACK_HEIGHT;

        scrollControls = scrollShell.add("group");
        scrollControls.orientation = "column";
        scrollControls.alignChildren = ["fill", "fill"];
        scrollControls.alignment = ["right", "fill"];
        scrollControls.margins = 0;
        scrollControls.spacing = 2;

        scrollUpButton = scrollControls.add("button", undefined, "^");
        scrollUpButton.preferredSize = [18, 22];

        scrollbar = scrollControls.add("scrollbar", undefined, 0, 0, 0);
        scrollbar.alignment = ["right", "fill"];
        scrollbar.preferredSize = [18, 240];

        scrollDownButton = scrollControls.add("button", undefined, "v");
        scrollDownButton.preferredSize = [18, 22];

        ui = {};
        ui.window = win;
        ui.scrollShell = scrollShell;
        ui.scrollViewport = scrollViewport;
        ui.scrollContent = scrollContent;
        ui.scrollUpButton = scrollUpButton;
        ui.scrollDownButton = scrollDownButton;
        ui.scrollbar = scrollbar;
        ui.scrollContentFallbackHeight = CB_SCROLL_CONTENT_FALLBACK_HEIGHT;
        ui.startInput = addLabeledEdit(scrollContent, "Start Value:", "0", 12);
        ui.endInput = addLabeledEdit(scrollContent, "End Value:", "100", 12);

        durationRow = scrollContent.add("group");
        durationRow.orientation = "row";
        durationRow.alignChildren = ["fill", "center"];
        durationRow.alignment = ["fill", "top"];
        durationLabel = durationRow.add("statictext", undefined, "Duration:");
        durationLabel.preferredSize.width = CB_LABEL_WIDTH;
        durationInput = durationRow.add("edittext", undefined, "2");
        durationInput.characters = 6;
        durationDropdown = durationRow.add("dropdownlist", undefined, [CB_DURATION_SECONDS, CB_DURATION_FRAMES, CB_DURATION_LAYER, CB_DURATION_WORK_AREA]);
        durationDropdown.alignment = ["fill", "center"];
        durationDropdown.selection = durationDropdown.items[0];
        ui.durationInput = durationInput;
        ui.durationModeDropdown = durationDropdown;

        ui.prefixInput = addLabeledEdit(scrollContent, "Prefix:", "", 12);
        ui.suffixInput = addLabeledEdit(scrollContent, "Suffix:", "", 12);

        decimalRow = scrollContent.add("group");
        decimalRow.orientation = "row";
        decimalRow.alignChildren = ["fill", "center"];
        decimalRow.alignment = ["fill", "top"];
        decimalLabel = decimalRow.add("statictext", undefined, "Decimal Places:");
        decimalLabel.preferredSize.width = CB_LABEL_WIDTH;
        decimalDropdown = decimalRow.add("dropdownlist", undefined, ["0", "1", "2", "3", "Custom"]);
        decimalDropdown.selection = decimalDropdown.items[0];
        decimalDropdown.alignment = ["fill", "center"];
        customDecimalsInput = decimalRow.add("edittext", undefined, "4");
        customDecimalsInput.characters = 4;
        ui.decimalDropdown = decimalDropdown;
        ui.customDecimalsInput = customDecimalsInput;

        ui.thousandsCheckbox = scrollContent.add("checkbox", undefined, "Thousands Separator");
        ui.thousandsCheckbox.value = true;

        ui.numberFormatDropdown = addDropdownRow(scrollContent, "Number Format:", ["International", "Indian"], 0);

        alignmentRow = scrollContent.add("group");
        alignmentRow.orientation = "row";
        alignmentRow.alignChildren = ["fill", "center"];
        alignmentRow.alignment = ["fill", "top"];
        alignmentLabel = alignmentRow.add("statictext", undefined, "Alignment:");
        alignmentLabel.preferredSize.width = CB_LABEL_WIDTH;
        alignmentDropdown = alignmentRow.add("dropdownlist", undefined, [CB_ALIGNMENT_LEFT, CB_ALIGNMENT_CENTER, CB_ALIGNMENT_RIGHT]);
        alignmentDropdown.alignment = ["fill", "center"];
        selectDropdownText(alignmentDropdown, CB_ALIGNMENT_RIGHT);
        ui.alignmentLabel = alignmentLabel;
        ui.alignmentDropdown = alignmentDropdown;

        animationPanel = buildRadioPanel(scrollContent, "Animation");
        ui.linearRadio = animationPanel.add("radiobutton", undefined, CB_ANIMATION_LINEAR);
        ui.easeOutRadio = animationPanel.add("radiobutton", undefined, CB_ANIMATION_EASE_OUT);
        ui.easeInOutRadio = animationPanel.add("radiobutton", undefined, CB_ANIMATION_EASE_IN_OUT);
        ui.easeOutRadio.value = true;

        layerPanel = buildRadioPanel(scrollContent, "Layer Mode");
        ui.createLayerRadio = layerPanel.add("radiobutton", undefined, CB_LAYER_CREATE);
        ui.applyLayerRadio = layerPanel.add("radiobutton", undefined, CB_LAYER_APPLY);
        ui.duplicateLayerRadio = layerPanel.add("radiobutton", undefined, CB_LAYER_DUPLICATE);
        ui.createLayerRadio.value = true;

        buttonGroup = scrollContent.add("group");
        buttonGroup.orientation = "column";
        buttonGroup.alignChildren = ["fill", "top"];
        buttonGroup.alignment = ["fill", "top"];
        ui.createButton = buttonGroup.add("button", undefined, "CREATE COUNTER");
        ui.updateButton = buttonGroup.add("button", undefined, "UPDATE SELECTED COUNTER");
        ui.removeButton = buttonGroup.add("button", undefined, "REMOVE COUNTER SETUP");

        statusText = win.add("statictext", undefined, "Ready");
        statusText.alignment = ["fill", "top"];
        statusText.preferredSize.height = 18;
        statusText.maximumSize.height = 22;
        ui.statusText = statusText;

        durationDropdown.onChange = function () {
            updateControlStates(ui);
        };
        decimalDropdown.onChange = function () {
            updateControlStates(ui);
        };
        ui.createLayerRadio.onClick = function () {
            updateControlStates(ui);
        };
        ui.applyLayerRadio.onClick = function () {
            updateControlStates(ui);
        };
        ui.duplicateLayerRadio.onClick = function () {
            updateControlStates(ui);
        };
        ui.createButton.onClick = function () {
            handleCreateCounter(ui);
        };
        ui.updateButton.onClick = function () {
            handleUpdateCounter(ui);
        };
        ui.removeButton.onClick = function () {
            handleRemoveCounter();
        };
        scrollbar.onChanging = scrollbar.onChange = function () {
            setScrollPosition(ui, this.value);
        };
        scrollUpButton.onClick = function () {
            scrollByAmount(ui, -ui.scrollbar.stepdelta);
        };
        scrollDownButton.onClick = function () {
            scrollByAmount(ui, ui.scrollbar.stepdelta);
        };
        attachMouseWheelScroll(win, ui);
        attachDragScroll(scrollViewport, ui);

        win.onResizing = win.onResize = function () {
            this.layout.resize();
            updateScrollState(ui);
        };

        updateControlStates(ui);
        win.layout.layout(true);
        updateScrollState(ui);
        return ui;
    }

    cbUi = buildUI(thisObj);
    if (cbUi.window instanceof Window) {
        cbUi.window.center();
        cbUi.window.show();
    } else {
        cbUi.window.layout.layout(true);
        cbUi.window.layout.resize();
    }
}(this));
