define(function (require) {
    var Postmonger = require('postmonger');
    var $ = require('jquery');
    var connection = new Postmonger.Session();
    var payload = {};
    var eventDefinitionKey;
    var schema;

    $(window).ready(function () {
        connection.trigger('ready');
        connection.trigger('requestInteraction');
    });
 
    connection.on('initActivity', function (data) {
        if (data && data['arguments'] && data['arguments'].execute.inArguments.length > 0) {
            payload = data;
            var templateMessage = payload['arguments'].execute.inArguments[0]?.templateMessage || "";

            // Check if templateMessage is a placeholder and set to empty if true
            if (templateMessage === "{{Interaction.templateMessage}}") {
                templateMessage = "";
            }

            $('#templateMessage').val(templateMessage);
            updateCharCounter();
        }
    });

    $('#templateMessage').on('input', function () {
        updateCharCounter();
    });

    function updateCharCounter() {
        var message = $('#templateMessage').val();
        var charCount = message.length;
        var charLimit = 1000;
        $('#charCounter').text(charCount + ' / ' + charLimit);
    }

    connection.on('requestedInteraction', function (settings) {
        eventDefinitionKey = settings.triggers[0].metaData.eventDefinitionKey;
        connection.trigger('requestSchema');
    });

    connection.on('requestedSchema', function (data) {
        schema = data.schema;
        console.log(schema);
        var columns = schema.map(function (column) {
            return column.key.split('.').pop();
        });

        $('#phoneColumn').empty();
        $('#variableDropdown').empty();
        $('#variableDropdownGeral').empty();

        columns.forEach(function (column) {
            $('#phoneColumn').append(new Option(column, column));
            $('#variableDropdown').append(new Option(column, column));
            $('#variableDropdownGeral').append(new Option(column, column));
        });
    });

    $('#insertVariableButton').on('click', function () {
        var selectedVariable = $('#variableDropdown').val();
        var currentMessage = $('#templateMessage').val();
        $('#templateMessage').val(currentMessage + '{{' + selectedVariable + '}}');
        var selectedVariable2 = $('#variableDropdownGeral').val();
        var currentMessage2 = $('#VariavelGeral').val();
        $('#VariavelGeral').val(currentMessage2 + '{{' + selectedVariable2 + '}}');
    });

    connection.on('clickedNext', function () {
        save();
        connection.trigger('nextStep');
    });

    connection.on('clickedBack', function () {
        connection.trigger('prevStep');
    });
    

    function save() {
        var templateMessage = $('#templateMessage').val();
        var selectedPhoneColumn = $('#phoneColumn').val();
        var selectedFromColum = $('#FromColum').val();
        var lista = document.getElementById('salvarcard').value;
        
        var listajson = JSON.parse(lista);

        // Verificar se 'listajson' é uma lista
        if (Array.isArray(listajson)) {
          console.log('listajson é uma lista:', listajson);
        
          // Iterar sobre a lista
          listajson.forEach(item => {
            // Verificar se cada item é um objeto
            if (typeof item === 'object' && item !== null) {
              // Acessar diretamente a propriedade 'Titulo_Card'
              console.log('Valores recuperados:', item.Titulo_Card);
              // Faça o que precisar com os valores aqui
            } else {
              console.error('Um item na lista não é um objeto:', item);
            }
          });
        } else {
          console.error('listajson não é uma lista.');
        }
       
       

        // Create a map for all schema keys
        var schemaMap = {};
        schema.forEach(function (column) {
            var columnName = column.key.split('.').pop();
            
            var columnValue = '{{Event.' + eventDefinitionKey + '.' + columnName + '}}';
            
            schemaMap[columnName] = columnValue;
        
        });

        // Replace all placeholders in the message
        for (var key in schemaMap) {
            if (schemaMap.hasOwnProperty(key)) {
                templateMessage = templateMessage.replace(new RegExp('{{' + key + '}}', 'g'), schemaMap[key]);
            }
        }
        
        // Construct inArguments for the payload
        var inArguments = [];
        inArguments.push({ "templateMessage": templateMessage });
        inArguments.push({ "phone": schemaMap[selectedPhoneColumn] });
        inArguments.push({ "from": selectedFromColum });
        inArguments.push({ "lista_card": listajson });
        // Update payload
        payload['arguments'] = payload['arguments'] || {};
        payload['arguments'].execute = payload['arguments'].execute || {};
        payload['arguments'].execute.inArguments = inArguments;
        payload['metaData'] = payload['metaData'] || {};
        payload['metaData'].isConfigured = true;

        
        connection.trigger('updateActivity', payload);
    }
});
