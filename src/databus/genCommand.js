var fs = require('fs'),
    xml2js = require('xml2js');

var parser = new xml2js.Parser();
fs.readFile(__dirname + '/Command.xml', function(err, data) {
    parser.parseString(data, function (err, result) {
        if (err) {
            console.error(err)
            return
        }

        var content = 'export const AppList=' + JSON.stringify(result['AppList']['AppServer'], undefined, 2)
        var w = fs.createWriteStream(__dirname + '/Command.js')
        w.write(content, function(err, data) {
            if (err) {
                console.error(err)
            } else {
                console.log('success')
            }
        })
    });
});

