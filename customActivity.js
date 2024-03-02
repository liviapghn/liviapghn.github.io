define( function( require ) {

    'use strict';
    
    var Postmonger = require( 'postmonger' );
    var $ = require( 'jquery.min' );

    var connection = new Postmonger.Session();
    var activityData = {};
    var journeyData = {};
    var schema = {};
    var fieldValues = {};
    var tokenExecute = null;

    var steps = [ // initialize to the same value as what's set in config.json for consistency
        { "label": "SETUP NEXT STEP", "key": "step1" },
        { "label": "DONE", "key": "step2" }
    ];
    var currentStep = steps[0].key;
    var activityName = undefined;
    var activityNamePrefix = "Next Step";
    var dataExtensionWarningSelector = '#glo-data-extension-warning';

    var APIEventSelector = '#glo-api-event-parameter';
    var APIEventSelectorValue = undefined;

    var controllerSelector = '#glo-controller-parameter';
    var controllerSelectorValue = undefined;

    var clientTypeSelector = '#glo-clientType-parameter'; 
    var clientTypeSelectorValue = undefined;

    var siguientePasoSelector = '#glo-next-step-parameter';
    var siguientePasoSelectorValue = undefined;

    var loaderSelector = '#glo-loader';
    /*$(document).ready(function(){
        $.ajax({
            type:     "GET",
            url:      "https://cloud.banca.santander.cl/customActivityTokenGenerate?custom-activity=nextStepActivity&token="+token.fuel2token,
            dataType: "json",
            success: function(data){                
                console.log('tokenExecuteData',data);  
                tokenExecute = data;                   
            }
        });
    });*/

    $(window).ready(onRender);
    connection.on('initActivity', onInitActivity);
    connection.on('requestedSchema', onRequestedSchema);
    connection.on('requestedInteraction', onRequestedInteraction);
    
    connection.on('requestedTokens', onGetTokens);
    connection.on('requestedEndpoints', onGetEndpoints);

    connection.on('clickedNext', onClickedNext);
    connection.on('clickedBack', onClickedBack);
    connection.on('gotoStep', onGotoStep);

    //on click in edit activity
    function onRender() {
        // JB will respond the first time 'ready' is called with 'initActivity'
        connection.trigger('ready');
        connection.trigger('requestSchema');
        connection.trigger('requestInteraction');
        connection.trigger('requestTokens');
        connection.trigger('requestEndpoints');
        
        $(APIEventSelector).change(function() {
            onInputChange();
        });

        $(clientTypeSelector).change(function() {
            onInputChange();
        });

        $(siguientePasoSelector).change(function() {
            onInputChange();
        });

        onInputChange(); 
        $(loaderSelector).css({"display": "none"});       
    }

    // Disable the next button if a value isn't selected
    function onInputChange() {
        var validInput = isValidInput();
        connection.trigger('updateButton', { button: 'next', enabled: validInput });
    }

    //next to OnRender
    function onInitActivity (data) {
        if (data) {
            activityData = data;
            activityName = activityData.name;
        }

        setActivityData();
        
        showStep(null, 1);
        connection.trigger('updateButton', { button: 'next', enabled: isValidInput() });
    }

    function setActivityData(){
        var hasInArguments = Boolean(
            activityData['arguments'] &&
            activityData['arguments'].execute &&
            activityData['arguments'].execute.inArguments &&
            activityData['arguments'].execute.inArguments.length > 0
        );

        var inArguments = hasInArguments ? activityData['arguments'].execute.inArguments : {};

        $.each(inArguments, function(index, inArgument) {
            $.each(inArgument, function(key, val) {
                if (key === 'APIEventSelectorInput') {
                    APIEventSelectorValue = val;
                }else if (key === 'clientTypeSelectorInput') {
                    clientTypeSelectorValue = val;
                }else if (key === 'siguientePasoSelectorInput') {
                    siguientePasoSelectorValue = val;
                }
            });
        });

        //Set saved values in Activity
        if (APIEventSelectorValue) {
            $(APIEventSelector).val(APIEventSelectorValue);
        }

        if (clientTypeSelectorValue) {
            $(clientTypeSelector).val(clientTypeSelectorValue);
        }

        if (siguientePasoSelectorValue) {
            $(siguientePasoSelector).val(siguientePasoSelectorValue);
        }
    }

    //to get Entry Source in Journey
    function onRequestedSchema (data) {
        schema = data['schema'];
        //console.log('onRequestedSchema-data',data);
        var schemaPresent = schema !== undefined && schema.length > 0;
        $(dataExtensionWarningSelector).toggle(!schemaPresent);

        connection.trigger('updateButton', { button: 'next', enabled: isValidInput() });
    }

    //to set Activity Name
    function onRequestedInteraction(data) {
        journeyData = data;
        activityName = getActivityName();
    }

    function onGetTokens (tokens) {
        // Response: tokens = { token: <legacy token>, fuel2token: <fuel api token> }
        //console.log('tokens',tokens);        
    }

    function onGetEndpoints (endpoints) {
        // Response: endpoints = { restHost: <url> } i.e. "rest.s1.qa1.exacttarget.com"
        // console.log(endpoints);
    }

    function onClickedNext () {
        if (currentStep.key === 'step2') {
            save();
        } else {
            connection.trigger('nextStep');
        }
    }

    function onClickedBack () {
        connection.trigger('prevStep');
    }

    function onGotoStep (step) {
        showStep(step);
        connection.trigger('ready');
    }

    function showStep(step, stepIndex) {
        if (stepIndex && !step) {
            step = steps[stepIndex-1];
        }

        currentStep = step;

        $('.step').hide();

        switch(currentStep.key) {
            case 'step1':
                $('#step1').show();
                connection.trigger('updateButton', {
                    button: 'next',
                    text: 'Next',
                    enabled: isValidInput() 
                });
                connection.trigger('updateButton', {
                    button: 'back',
                    visible: false
                });
                break;
            case 'step2':
                $('#step2').show();
                connection.trigger('updateButton', {
                    button: 'back',
                    visible: true
                });
                connection.trigger('updateButton', {
                    button: 'next',
                    text: 'Done',
                    visible: true
                });
                break;
        }
    }

    function save() {
        activityData.name = getActivityName();
        configureInArguments();
        activityData['metaData'].isConfigured = true;
        connection.trigger('updateActivity', activityData);
    }

    function configureInArguments() {
        var inArguments = [];
        var prefix = '';
        if (schema !== undefined && schema.length > 0) {
            for (var i in schema) {
                var field = schema[i];
                if (isEventDataSourceField(field)) {
                    var fieldName = extractFieldName(field);
                    if(fieldName == 'DetalleOportunidad'){
                        var prefixedFieldName = prefix + fieldName;
                        inArguments[fieldName] = "{{" + field.key + "}}";
                        saveFieldToInArguments(field, prefixedFieldName, inArguments);                      
                    }                    
                }
            }
        }
        
        inArguments.push({ "APIEventSelectorInput": getAPIEventSelector() });
        inArguments.push({ "clientTypeSelectorInput": getClientTypeSelector() });
        inArguments.push({ "siguientePasoSelectorInput": getSiguientePasoSelector() });
        inArguments.push({ 'activityName': activityName });

        activityData['arguments'].execute.inArguments = inArguments;
        console.log("inArguments",inArguments);
    }

    function isValidInput() {
        if( isEmptyString(getAPIEventSelector()) || 
            isEmptyString(getSiguientePasoSelector()) || 
            isEmptyString(getClientTypeSelector()) )
            return false;
                
        return true;
    }

    function getActivityName() {
        if (isEmptyString(activityName)) {
            activityName = constructActivityName();
        }
        return activityName;
    }

    function constructActivityName() {
        var namedActivities = $.grep(journeyData['activities'], function(activity) {
            return !isEmptyString(activity.name) && activity.name.startsWith(activityNamePrefix);
        });
        var activityIndex = namedActivities ? namedActivities.length + 1 : 0;
        return activityNamePrefix + activityIndex;
    }

    function getAPIEventSelector() {
        return $(APIEventSelector).val();
    }  

    function getControllerSelector() {
        return $(controllerSelector).val();
    } 

    function getClientTypeSelector() {
        return $(clientTypeSelector).val();
    } 

    function getSiguientePasoSelector() {
        return $(siguientePasoSelector).val();
    }  

    function saveFieldToInArguments(field, fieldName, inArguments) {
        var obj = {};
        obj[fieldName] = "{{" + field.key + "}}";
        inArguments.push(obj);
    }

    function isEventDataSourceField(field) {
        return !field.key.startsWith('Interaction.');
    }

    function extractFieldName(field) {
        var index = field.key.lastIndexOf('.');
        return field.key.substring(index + 1);
    }

    function isEmptyString(text) {
        return (!text || text.length === 0);
    }
});
