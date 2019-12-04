const fs = require('fs')

//TODO : Make it recursively scan deeper folders.
function readFiles(dirname, onFileContent) {
    const filenames = fs.readdirSync(dirname)
    filenames.forEach(function (filename) {
        if (filename != ".DS_Store") {
            const content = fs.readFileSync(dirname + filename, 'utf-8')
            console.log("Compiling : " + filename)
            onFileContent(filename, content);
        }
    })
}

var map = {}
var constants = {}

readFiles("./Constants/", (name, content) => {
    const jsonObject = JSON.parse(content);
    const mapKey = name.replace(/\.[^/.]+$/, "")
    constants[mapKey] = jsonObject;
}, console.log)

readFiles("./Mappings/", (name, content) => {
    const jsonObject = JSON.parse(content);
    const chokeMatrix = Array(64).fill([])
    const encoderColorMatrix = Array(64).fill(0)
    const buttonColorMatrix = Array(64).fill(0)
    const receiveEncoder = Array(64).fill(false)
    const receiveButton = Array(64).fill(false)

    const mapKey = name.replace(/\.[^/.]+$/, "")
    Object.keys(jsonObject).forEach(key => {
        const obj = jsonObject[key]
        console.log("- Parameter : " + key)
        obj.color = constants["_colors"][obj.color]

        if ("position" in obj) {
            if (Array.isArray(obj.position[0])) {
                obj.position = obj.position.map(v => {
                    const x = ((v[0] - 1) * 16) + ((v[1] - 1) * 4) + ((v[2] - 1) * 1)
                    return x
                })
                obj.position.forEach(x => {
                    chokeMatrix[x] = obj.position.filter(y => y != x)
                    receiveButton[x] = true
                    buttonColorMatrix[x] = obj.color
                })
            }
            else {
                obj.position = [((obj.position[0] - 1) * 16) + ((obj.position[1] - 1) * 4) + ((obj.position[2] - 1) * 1)]
            }
        }

        if ("type" in obj) {
            switch (obj.type) {
                case "enum":
                    {
                        obj.type = 1;
                        break;
                    }
                case "toggle":
                    {
                        obj.type = 2;
                        chokeMatrix[obj.position[0]] = [obj.position[0]]
                        receiveButton[obj.position[0]] = true
                        buttonColorMatrix[obj.position[0]] = obj.color
                        break;
                    }
            }
        }
        else {
            obj.type = 0;
            receiveEncoder[obj.position[0]] = true
            encoderColorMatrix[obj.position[0]] = obj.color
        }
    });
    
    //Bake in data-oriented array so Max patch has easier time reading them.
    jsonObject.chokeMatrix = chokeMatrix
    jsonObject.receiveEncoder = receiveEncoder
    jsonObject.receiveButton = receiveButton 

    //Summarize what color to use for which control.
    const colorMatrix = Array(64).fill(undefined)
    for(var i = 0; i < 64; i++)
    {
        if(jsonObject.receiveEncoder[i] === true)
        {
            colorMatrix[i] = encoderColorMatrix[i]
        }
        else
        {
            colorMatrix[i] = buttonColorMatrix[i]
        }
    }
    jsonObject.colorMatrix = colorMatrix

    map[mapKey] = jsonObject;
}, console.log)


fs.writeFileSync("./compiled.json", JSON.stringify(map))
console.log("Preprocessed JSON files.")