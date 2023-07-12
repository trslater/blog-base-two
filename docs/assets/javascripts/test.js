const elt = document.getElementById("calculator")
const calculator = Desmos.GraphingCalculator(elt, {
    keypad: false,
    expressions: false,
    showGrid: false,
    lockViewport: true
})

calculator.setState({
    "graph": {
        "viewport": {
            "xmin": -1, "xmax": 10,
            "ymin": -1, "ymax": 5
        },
        showGrid: false
    },
    "expressions": {
        "list":[
            {
                "id": "A",
                "latex": "A = (1, 2)",
                "color": "#ef5552",
                "showLabel": true,
                "label": "`A`"
            }, {
                "id": "B",
                "latex": "B = (3, 1)",
                "color": "#ef5552",
                "showLabel": true,
                "label": "`B`"
            }, {
                "id": "AB",
                "latex": "A, B",
                "color": "#ef5552",
                "points": false,
                "lines": true
            }, {
                "id": "AB Label",
                "latex": "(A + B)/2",
                "color": "#ef5552",
                "showLabel": true,
                "label": "`B - A`"
            }
        ]
    }
})
