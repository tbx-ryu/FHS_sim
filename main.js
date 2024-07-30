var GRAPH_ANIME_TIME = 50; // msec
var SUD_MIN = 43;
var LIFT_MIN = 43;
var MID_SUD_VAL = 100;

function getDatasets() {
    let arrBPM = getBPMdataset();
    let arrHS = getHSdataset(arrBPM);
    if (arrBPM.slice(-1)[0]["x"] < arrHS.slice(-1)[0]["x"]) {
        arrBPM.slice(-1)[0]["x"] = arrHS.slice(-1)[0]["x"];
    }
    return [arrBPM, arrHS];
}

function getBPMdataset() {
    let arrBPM = [];
    let table = document.getElementById('bpmTable');
    for (let rowNum = 1; rowNum < table.rows.length; rowNum++) { //skip header and footer(img of +)
        let row, barNum, notesType, beatNum, bpm;
        row = table.rows[rowNum]
        if(rowNum == 1) {
            row.cells["barInfo"].children["barNum"].value = 1;
            row.cells["barInfo"].children["barNum"].setAttribute("disabled", "disabled");
            row.cells["beatInfo"].children["notesType"].value = 4;
            row.cells["beatInfo"].children["beatNum"].value = 1;
        } else {
            row.cells["barInfo"].children["barNum"].removeAttribute("disabled");
        }
        barNum = parseFloat(row.cells["barInfo"].children["barNum"].value);
        notesType = parseInt(row.cells["beatInfo"].children["notesType"].value);
        beatNum = parseInt(row.cells["beatInfo"].children["beatNum"].value);
        bpm = parseInt(row.cells["BPMInfo"].children["BPM"].value)
        if(barNum && notesType && beatNum) {
            arrBPM.push({x: calcTiming(barNum, notesType, beatNum), bpm: bpm})
        }
    }
    // console.log(arrBPM)
    arrBPM.sort(function (a, b) {
        return a.x - b.x;
    });
    // endの小節線情報を追加
    let xmax = document.getElementById("xmax").value == "" ? Math.max(100, arrBPM.slice(-1)[0]["x"]+10) : parseInt(document.getElementById("xmax").value);
    arrBPM.push({x: xmax, bpm: arrBPM[arrBPM.length-1].bpm});
    return arrBPM;
}
function getHSdataset(arrBPM, getRaw=false) {
    let arrHS = [];
    let arrRaw = [];
    arrHS.push(getInitialSetting(arrBPM[0].bpm));
    let table = document.getElementById('operationTable');
    for (let rowNum = 1; rowNum < table.rows.length; rowNum++) { //skip header and footer(img of +)
        let row, barNum, notesType, beatNum, operation, rowAdd;
        row = table.rows[rowNum]
        barNum = parseFloat(row.cells["barInfo"].children["barNum"].value);
        notesType = parseInt(row.cells["beatInfo"].children["notesType"].value);
        beatNum = parseInt(row.cells["beatInfo"].children["beatNum"].value);
        // operation = "hoge"; //parseInt(row.cells["BPMInfo"].children["BPM"].value);
        operation = {hsType: row.className,
                     opType: row.cells["operation"].children["opType"].value,
                     opValue: row.cells["operation"].children["operationValue"].value}
        if(calcTiming(barNum, notesType, beatNum) > 0) {
            rowAdd = calcOperation(calcTiming(barNum, notesType, beatNum), arrHS[rowNum-1], arrBPM, operation);
            row.cells["memo"].children["memoVal"].value = rowAdd["memo"]
            arrHS.push(rowAdd);
            if (getRaw) {
                operation["x"] = calcTiming(barNum, notesType, beatNum);
                arrRaw.push(operation)
            }
        }
    }
    arrHS.sort(function (a, b) {
        return a.x - b.x;
    })
    if (getRaw) {
        return arrRaw;
    }
    for (let arrBPMr of arrBPM.slice(1, -1)) {
        let arrAdd = arrBPMr["x"] == 1 ?
                        structuredClone(arrHS[0]) :
                        structuredClone(arrHS.findLast(function (arrHSr) {
                                return arrHSr["x"] <= arrBPMr["x"]; 
                            }));
        arrAdd["x"] = arrBPMr["x"];
        arrAdd["midori"] = calcHS2Midori(arrAdd["hs"], arrAdd["sud"], arrAdd["lift"], arrAdd["hid"], arrAdd["hasSud"], arrAdd["hasLift"], arrBPMr["bpm"]);
        arrHS.push(arrAdd);
        arrHS.sort(function (a, b) {
            return a.x - b.x;
        })
    }
    const lastHS = Object.assign({}, arrHS.slice(-1)[0]);
    lastHS.x = document.getElementById("xmax").value == "" ? Math.max(100, lastHS["x"]+10) : parseInt(document.getElementById("xmax").value);
    arrHS.push(lastHS);
    return arrHS;
}

function calcTiming(barNum, notesType, beatNum) {
    return barNum + 1 / notesType * (beatNum - 1)
}

function getInitialSetting(iniBPM, getRaw=false) {
    let sud, lift, hid, midori, hs, isFHS;
    let hasSud = document.getElementById('hasSud').checked;
    let hasLift = document.getElementById('hasLift').checked;
    // let hasHid = document.getElementById('hasHid').checked;
    let hasHid = false;
    isFHS = document.getElementsByName('isFHS')[0].checked;
    if(!(hasSud || hasLift || hasHid)) {
        if (isFHS) {
            hs = parseFloat(document.getElementById('opHS').value)
        } else {
            hs = hsFix(parseFloat(document.getElementById('opHS').value));
            document.getElementById("opHS").value = hs.toFixed(2);
        }
        [sud, lift, hid] = [MID_SUD_VAL, 0, 0];
        midori = calcHS2Midori(hs=hs, sud=sud, lift=lift, hid=hid, hasSud=hasSud, hasLift=hasLift, bpm=iniBPM);
        document.getElementById('opMidori').value = parseInt(midori);
    } else {
        sud = hasSud? parseInt(document.getElementById('opSud').value) : MID_SUD_VAL;
        lift = hasLift? parseInt(document.getElementById('opLift').value) : 0;
        hid = hasHid? parseInt(document.getElementById('opHid').value) : 0;
        if(isFHS) {
            midori = parseInt(document.getElementById('opMidori').value);
            hs = calcMidori2HS(midori=midori, sud=sud, lift=lift, hid=hid, hasSud=hasSud, hasLift=hasLift, bpm=iniBPM);
            document.getElementById('opHS').value = hs.toFixed(2);
        } else {
            hs = hsFix(parseFloat(document.getElementById('opHS').value));
            midori = calcHS2Midori(hs=hs, sud=sud, lift=lift, hid=hid, hasSud=hasSud, hasLift=hasLift, bpm=iniBPM);
            document.getElementById('opHS').value = hs.toFixed(2);
            document.getElementById('opMidori').value = parseInt(midori);
        }
    }
    if (getRaw) {
        return {isFHS: isFHS, midori: midori, hs: hs, hasSud: hasSud, hasLift: hasLift, hasHid: hasHid, sud: sud, lift: lift, hid: hid}
    } else {
        return {x: 1, midori: midori, memMidori:midori, sud: sud, lift: lift, hid: hid, hs: hs, hasSud: hasSud, sudInit: hasSud, hasLift: hasLift};
    }
}

function validateValue(arr) {
    errStr = "";
    const ranges = [
        {key: "midori", min: 1, max: "", cond: true},
        {key: "sud", min: 43, max: 1000, cond: arr["hasSud"]},
        {key: "lift", min: 43, max: 1000, cond: arr["hasLift"]},
        {key: "hs", min: 0.01, max: "", cond: true}];
    for (let range of ranges) {
        if (range.min != "") {
            if (arr[range.key] < range.min && range.cond) {
                arr[range.key] = range.min;
                errStr += "下限";
            }
        }
        if (range.max != "") {
            if (range.max < arr[range.key] && range.cond) {
                arr[range.key] = range.max;
                errStr += "上限";
            }
        }
    }
    return arr, errStr;
}

function calcOperation(x, prevArr, arrBPM, op) {
    let memo = "", limitStr = "";
    let bpm = x==1 ? arrBPM[0]["bpm"] : arrBPM.findLast(function (bpmInfo) {
                        return bpmInfo["x"] <= x; 
                        })["bpm"];
    let curArr = structuredClone(prevArr);
    curArr["x"] = x;
    if (op["opType"] == "hs_down" || op["opType"] == "hs_up") {
        // 黒鍵盤と白鍵盤
        let hsChangeVal = (op["hsType"] == "table_fhs" && (curArr["hasSud"] || curArr["hasLift"])) ? 0.5 * parseInt(op["opValue"]) : 0.25 * parseInt(op["opValue"]);
        curArr["hs"] = op["opType"] == "hs_down" ? curArr["hs"] - hsChangeVal : curArr["hs"] + hsChangeVal;
        curArr, limitStr = validateValue(curArr);
        curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
        memo = generateMemo(["HS"+limitStr], [prevArr["hs"]], [curArr["hs"]]);
    } else if (op["opType"] == "sud_off") {
        // サドプラ外し
        curArr["hasSud"] = false;
        curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
        memo = generateMemo(["sud"], [prevArr["sud"]], [0]);
    } else if (op["opType"] == "sud_on") {
        // サドプラ付け
        curArr["hasSud"] = true;
        if (!curArr["sudInit"] && op["hsType"] == "table_fhs") {
            // ここ緑に合わせてHSが変わる？SUDの白数字が変わる？
            curArr["hs"] = calcMidori2HS(curArr["midori"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
            curArr["sudInit"] = true;
            memo = generateMemo(["sud", "HS"], [0, prevArr["hs"]], [curArr["sud"], curArr["hs"]]);
        } else {
            curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
            memo = generateMemo(["sud", "緑数字"], [0, prevArr["midori"]], [curArr["sud"], curArr["midori"]]);
        }
    } else if (op["opType"] == "turntable"){
        // 皿回したとき
        if (op["hsType"] == "table_fhs") {
            if (curArr["hasSud"] == true) {
                curArr["sud"] += parseInt(op["opValue"]);
                curArr, limitStr = validateValue(curArr);
                curArr["hs"] = calcMidori2HS(curArr["memMidori"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
                curArr["midori"] = curArr["memMidori"];
                memo = generateMemo(["sud"+limitStr, "HS"], [prevArr["sud"], prevArr["hs"]], [curArr["sud"], curArr["hs"]]);
            } else if (curArr["hasLift"] == true && curArr["sudInit"] == false) {
                curArr["lift"] += parseInt(op["opValue"]);
                curArr, limitStr = validateValue(curArr);
                curArr["hs"] = calcMidori2HS(curArr["memMidori"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
                curArr["midori"] = curArr["memMidori"];
                memo = generateMemo(["Lift"+limitStr, "HS"], [prevArr["lift"], prevArr["hs"]], [curArr["lift"], curArr["hs"]]);
            } else if (curArr["sudInit"] == true) {
                curArr["lift"] += parseInt(op["opValue"]);
                curArr, limitStr = validateValue(curArr);
                curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
                memo = generateMemo(["Lift"+limitStr, "緑数字"], [prevArr["lift"], prevArr["midori"]], [curArr["lift"], curArr["midori"]]);
            } else {
                curArr["hs"] += parseFloat(op["opValue"]);
                curArr, limitStr = validateValue(curArr);
                curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
                memo = generateMemo(["HS"+limitStr, "緑数字"], [prevArr["hs"], prevArr["midori"]], [curArr["hs"], curArr["midori"]]);
            }
        } else {
            if (curArr["hasSud"] == true) {
                curArr["sud"] += parseInt(op["opValue"]);
                curArr, limitStr = validateValue(curArr);
                curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
                memo = generateMemo(["sud"+limitStr, "緑数字"], [prevArr["sud"], prevArr["midori"]], [curArr["sud"], curArr["midori"]]);
            } else if (curArr["hasLift"] == true) {
                curArr["lift"] += parseInt(op["opValue"]);
                curArr, limitStr = validateValue(curArr);
                curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
                memo = generateMemo(["Lift"+limitStr, "緑数字"], [prevArr["lift"], prevArr["midori"]], [curArr["lift"], curArr["midori"]]);
            } else {
                console.log("nani mo nai");
                memo = "No Changes";
            }
        }
    } else if (op["opType"] == "hstype_change") {
        if (op["hsType"] == "table_fhs") {
            curArr["memMidori"] = curArr["midori"];
            memo = generateMemo(["HS種別"], ["CHS"], ["FHS"]);
        } else {
            curArr["hs"] = hsFix(parseFloat(curArr["hs"]));
            curArr, _ = validateValue(curArr);
            curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
            memo = generateMemo(["HS種別", "緑数字", "HS"], ["FHS", prevArr["midori"], prevArr["hs"]], ["CHS", curArr["midori"], curArr["hs"]]);
        }
    }
    curArr["memo"] = memo;
    return curArr; 
}

function generateMemo(params, preVals, curVals) {
    let memoArr = [];
    let param, preVal, curVal;
    for ([param, preVal, curVal] of zip(params, preVals, curVals)) {
        memoArr.push(`${param}\u003A(${formatStr(preVal)}→${formatStr(curVal)})`);
    }
    return memoArr.join(", ");
}

function formatStr (str) {
    str = String(str);
    if (str.includes(".")) {
        str = str.split(".")[0] + "." + str.split(".")[1].slice(0,2);
    };
    return str;
}

function hsFix(hs) {
    return Math.round(hs / 0.25) * 0.25;
}

function calcHS2Midori(hs, sud, lift, hid, hasSud, hasLift, bpm, baseMidori=348000) {
    // console.log(sud)
    sud = hasSud == true ? sud: 0;
    lift = hasLift == true ? lift: 0;
    return (baseMidori/(bpm*hs)*(1-(sud+hid+lift)/1000))/2 // diveded by 2 because Lightning Model
}

function calcMidori2HS(midori, sud, lift, hid, hasSud, hasLift, bpm, baseMidori=348000) {
    sud = hasSud == true ? sud: 0;
    lift = hasLift == true ? lift: 0;
    return (baseMidori/(bpm*midori)*(1-(sud+hid+lift)/1000))/2 // diveded by 2 because Lightning Model
}

function drawChart(datasets, canvasID) {
    let graphRange = getGraphRange(canvasID, datasets);
    let jsondata, valueKeys, chartTypes, colors, axes;
    const colorPalet = {"bpm":"#ea5550", "midori":"#37a34a", "sud": "#555555", "lift": "#555555", "hs": "#999999"};
    const labelPalet = {"bpm": "BPM", "midori": "緑数字", "sudlift": "Lift / Sudden+", "hs": "ハイスピード"};
    if (canvasID == "sudlift") {
        jsondata = datasets.map((x) => {x["sud"] = parseInt(x["sud"])*(-1); return x});
        valueKeys = ["sud", "lift"];
        chartTypes = {"sud": "area-step", "lift": "area-step"};
        colors = {"sud": colorPalet["sud"], "lift": colorPalet["lift"]};
        axes = {sud: "y2", lift: "y"};
    } else {
        jsondata = datasets;
        valueKeys = [canvasID];
        chartTypes = {[canvasID]: "step"};
        colors = {[canvasID]: [colorPalet[canvasID]]};
        axes = {[canvasID]: "y"};
    }
    let chart = c3.generate({
        padding: {left: 45},
        bindto: document.getElementById(canvasID),
        data: {
            json: jsondata,
            keys: {
                x: "x",
                value: valueKeys,
            },
            colors: colors,
            types: chartTypes,
            axes: axes,
        },
        line: {
            step: {
                type: "step-after",
            },
        },
        legend: {
            show: false,
        },
        axis: {
            x: {
                min: 1,
                padding: {
                    left: 0,
                    right: 5,
                },
                tick: {
                    values: range(0, (Math.ceil(graphRange["xmax"] / 10) + 1) * 10),
                    format: d3.format(".0f")
                },
                label: {
                    text: "小節数",
                }
            },
            y: {
                min: graphRange["ymin"],
                max: graphRange["ymax"],
                padding: {
                    bottom: 0,
                    top: 10,
                },
                tick: {
                    format: d3.format(" 4"),
                },
                label: {
                    text: labelPalet[canvasID],
                }
            },
            y2: {
                min: -1000,
                max: 0,
                padding: {
                    bottom: 0,
                    top: 10,
                },
            }
        },
        transition: {
            duration: GRAPH_ANIME_TIME,
        }, 
    });
    return chart;
}

function updateCharts() {
    let dataBPMChange, dataHSChange;
    [dataBPMChange, dataHSChange] = getDatasets();
    chartSettings = {
        "bpm": {"chart": bpmChart, "datasets": dataBPMChange, "graphRange": {}},
        "midori": {"chart": midoriChart, "datasets": dataHSChange, "graphRange": {}},
        "sudlift": {"chart": sudliftChart, "datasets": dataHSChange, "graphRange": {}},
        "hs": {"chart": hsChart, "datasets": dataHSChange, "graphRange": {}},
    };
    chartSettings["bpm"]["graphRange"] = getGraphRange("bpm", dataBPMChange);
    chartSettings["midori"]["graphRange"] = getGraphRange("midori", dataHSChange);
    chartSettings["sudlift"]["graphRange"] = {"xmin": chartSettings["midori"]["graphRange"]["xmin"], "xmax": chartSettings["midori"]["graphRange"]["xmax"], "ymax": 1000, "ymin": 0};
    chartSettings["hs"]["graphRange"] = {"xmin": chartSettings["midori"]["graphRange"]["xmin"], "xmax": chartSettings["midori"]["graphRange"]["xmax"], "ymax": 10, "ymin": 0};

    let jsondata, valueKeys;
    let dataOp = getHSdataset(dataBPMChange, getRaw=true);
    for (let [axKey, chartSetting] of Object.entries(chartSettings)) {
        if (axKey == "sudlift") {
            jsondata = chartSetting["datasets"].map((x) => {x["sud"] = parseInt(x["sud"])*(-1); return x});
            valueKeys = ["sud", "lift"]
            chartTypes = {"sud": "area-step", "lift": "area-step"} // TODO SUDの値を-1000する，y2軸の設定，drawの改修
        } else {
            jsondata = chartSetting["datasets"];
            valueKeys = [axKey];
            chartTypes = {[axKey]: "step"};
        }
        chartSetting["chart"].load({
            json: jsondata,
            keys: {
                x: "x",
                value: valueKeys,
            },
            types: chartTypes,
        })
        chartSetting["chart"].axis.min({x: chartSetting["graphRange"]["xmin"], y: chartSetting["graphRange"]["ymin"]});
        chartSetting["chart"].axis.max({x: chartSetting["graphRange"]["xmax"], y: chartSetting["graphRange"]["ymax"]});
        chartSetting["chart"].internal.config.axis_x_tick_values = range(0, (Math.ceil(chartSetting["graphRange"]["xmax"] / 10 + 1) * 10));
        chartSetting["chart"].xgrids.remove();
    }
    setTimeout(() => {
        for (let chartSetting of Object.values(chartSettings)) {
            let opText;
            for (let op of dataOp) {
                opText = "sud_off, sud_on, hstype_change".includes(op["opType"]) ? op["opType"] : op["opType"] + "=" + op["opValue"];
                chartSetting["chart"].xgrids.add([{value: parseFloat(op["x"]), text: opText}])
            }
            chartSetting["chart"].flush();
        }}, GRAPH_ANIME_TIME + 50)
}

function* zip(...iterables) {
    const iterators = iterables.map(it => it[Symbol.iterator]());
    while (iterators.length) {
        const result = [];
        for (const it of iterators) {
            const elemObj = it.next();
            if (elemObj.done) {
                return;
            }
            result.push(elemObj.value);
        }
        yield result;
    }
}

// HS操作に更新があった際，各タイミングでFHSかCHSかなど確認する
function checkOperations() {
    const tbl = document.getElementById("operationTable");
    // const textSarachon = document.getElementById("textSarachon");
    // const operationValue = document.getElementById("operationValue")
    let hasSud = document.getElementById("hasSud").checked;
    let sarachonTarget = hasSud ? "sud" : "lift";
    let isFHS = document.getElementsByName('isFHS')[0].checked;
    let cell;
    const wSarachon = ["sud_up", "sud_down", "lift_up", "lift_down", "turntable"];
    const wOperationValue = ["hs_down", "hs_up", "sud_up", "sud_down", "lift_up", "lift_down", "turntable"];
    for (let i=1; i<tbl.rows.length; i++) {
        cell = tbl.rows[i].cells["operation"]
        // sud_on / sud_off check
        if (hasSud) {
            cell.children["opType"].children["sud_on"].disabled = true;
            cell.children["opType"].children["sud_off"].disabled = false;
            if (cell.children["opType"].value == "sud_on") {
                cell.children["opType"].value = "sud_off";
            }
        } else {
            cell.children["opType"].children["sud_off"].disabled = true;
            cell.children["opType"].children["sud_on"].disabled = false;
            if (cell.children["opType"].value == "sud_off") {
                cell.children["opType"].value = "sud_on";
            }
        }
        // hstype & sarachon & value range check
        if (cell.children["opType"].value == "hstype_change") {
            isFHS = !isFHS
        } else if (cell.children["opType"].value == "sud_off") {
            hasSud = false;
        } else if (cell.children["opType"].value == "sud_on") {
            hasSud = true;
            sarachonTarget = "sud";
        } else if (cell.children["opType"].value == "turntable") {
            cell.children["operationValue"].setAttribute("min", -1000);
        } else {
            cell.children["operationValue"].setAttribute("min", 0);
        }
        // coloring & formating column
        if (isFHS){
            tbl.rows[i].className = "table_fhs";
            if (wSarachon.includes(cell.children["opType"].value) && (hasSud || (!hasSud && sarachonTarget == "lift"))) {
                cell.children["textSarachon"].hidden = false;
            } else {
                cell.children["textSarachon"].hidden = true;
            }
        } else {
            tbl.rows[i].className = "table_chs";
            cell.children["textSarachon"].hidden = true;
            cell.children["operationValue"].hidden = true;
        }
        if (wOperationValue.includes(cell.children["opType"].value)) {
            cell.children["operationValue"].hidden = false;
        } else {
            cell.children["operationValue"].hidden = true;
        }
    }
}

function sortTable(tableId) {
    let nRow;
    let oldTable = document.getElementById(tableId);
    let oldTbody = oldTable.getElementsByTagName("tbody")[0];
    let oldTrs = oldTbody.getElementsByTagName("tr")
    let newIdxs = new Array();

    for (nRow = 0; nRow < oldTrs.length; nRow++) { // skip footer (img of +)
        barNum = parseFloat(oldTable.rows[nRow+1].cells["barInfo"].children["barNum"].value);
        notesType = parseInt(oldTable.rows[nRow+1].cells["beatInfo"].children["notesType"].value);
        beatNum = parseInt(oldTable.rows[nRow+1].cells["beatInfo"].children["beatNum"].value);
        newIdxs[nRow] = {
            idx: nRow,
            value:calcTiming(
                Boolean(barNum) ? barNum : 1,
                Boolean(notesType) ? notesType : 4,
                Boolean(beatNum) ? beatNum : 1
            )};
    }
    newIdxs.sort(tableCompare)
    for (nRow = 0; nRow < newIdxs.length; nRow++) { // skip footer (img of +)
        let newSelect, oldSelect;
        // let newRow = oldTable.insertRow(-1);
        // oldTbody.appendChild(oldTrs[newIdxs[nRow]["idx"]].cloneNode(true));
        $("#"+tableId).find("tbody tr").slice(newIdxs[nRow]["idx"], newIdxs[nRow]["idx"]+1).clone(true).appendTo($("#"+tableId).find("tbody"))
        for (let nSelect=0; nSelect<$("#"+tableId).find("tbody tr:last-child").find("select").length; nSelect++) {
            newSelect = $("#"+tableId).find("tbody tr:last-child").find("select")[nSelect]
            oldSelect = $("#"+tableId).find("tbody tr").slice(newIdxs[nRow]["idx"], newIdxs[nRow]["idx"]+1).find("select")[nSelect]
            $(newSelect).val($(oldSelect).val())
        }
    }
    for (nRow = 0; nRow < newIdxs.length; nRow++) {
        oldTbody.deleteRow(0);
    }
}

function tableCompare(a, b) {
    if (a.value == b.value) {
        return 0;
    } else if (a.value > b.value) {
        return 1;
    } else {
        return -1;
    }
}

function range(start, stop, step=10) {
    return Array.from({ length: (stop - start) / step + 1}, (_, i) => start + i * step);
}

function getGraphRange(axKey, datasets, padding=10) { //getGraphRange
    let graphRange = {};
    let BPMdataset, HSdataset
    [BPMdataset, HSdataset] = getDatasets();
    // let datasets = axKey == "bpm" ? BPMdataset : HSdataset;
    let xminU = document.getElementById("xmin").value;
    let xmaxU = document.getElementById("xmax").value;
    graphRange["xmin"] = 1; // start ha itsumo 1
    graphRange["xmax"] = Math.max(parseInt(BPMdataset.slice(-1)[0]["x"]), parseInt(HSdataset.slice(-1)[0]["x"]));

    let yminU = "", ymaxU = "";
    if (axKey == "sudlift" || axKey == "hs") {
        graphRange["ymin"] = 0;
        graphRange["ymax"] = axKey == "sudlift" ? 1000: 10;
    } else {
        yminU = document.getElementById(axKey+"min").value;
        ymaxU = document.getElementById(axKey+"max").value;
        graphRange["ymin"] = parseInt(datasets[0][axKey]) - padding;
        graphRange["ymax"] = parseInt(datasets[0][axKey]) + padding;
    }
    for (data of datasets) {
        graphRange["xmin"] = xminU == "" ? Math.min(graphRange["xmin"], data["x"]) : parseInt(xminU);
        graphRange["xmax"] = xmaxU == "" ? Math.max(graphRange["xmax"], data["x"]) : parseInt(xmaxU);
        if (axKey != "sudlift" || axKey != "hs") {
            graphRange["ymin"] = yminU == "" ? Math.min(graphRange["ymin"], parseInt(data[axKey])-padding) : parseInt(yminU);
            graphRange["ymax"] = ymaxU == "" ? Math.max(graphRange["ymax"], parseInt(data[axKey])+padding) : parseInt(ymaxU);
        }
    }
    graphRange["xmin"] = graphRange["xmin"] < 1 ? 1 : graphRange["xmin"];
    graphRange["ymin"] = graphRange["ymin"] < 0 ? 0 : graphRange["ymin"];
    return graphRange;
}

function urlToParams() {
    const params = new URLSearchParams(window.location.search);
    let title, arrBPM, arrOP, rowInit;
    title = params.get("title");
    arrBPM = strToObj(params, "bpm");
    arrOP = strToObj(params, "op");
    rowInit = strToObj(params, "init")[0];
    
    // set params from array
    $("#musicTitle").attr("value", title)
    for (let rowBPM of arrBPM) {
        $("#bpmTable").find("tbody tr:last-child input[name='barNum']").val(rowBPM["x"]);
        $("#bpmTable").find("tbody tr:last-child input[name='BPM']").val(rowBPM["bpm"]);
        if ($("#bpmTable").find("tbody tr").length < arrBPM.length) {
            $("#bpmTable").find("tbody tr:last-child").clone(true).appendTo($("#bpmTable").find("tbody"));
        }
    }
    for (let rowOP of arrOP) { // OPの方は，x=100がない
        $("#operationTable").find("tbody tr:last-child input[name='barNum']").val(rowOP["x"]);
        $("#operationTable").find("tbody tr:last-child select[name='opType']").val(replaceStrings(rowOP["opType"], reverse=true));
        $("#operationTable").find("tbody tr:last-child input[name='operationValue']").val(rowOP["opValue"]);
        if ($("#operationTable").find("tbody tr").length < arrOP.length) {
            $("#operationTable").find("tbody tr:last-child").clone(true).appendTo($("#operationTable").find("tbody"));
        }
    }
    if (rowInit["isFHS"] == "t") {
        $("#operationTable").find("input[name='isFHS']:eq(0)").prop("checked", true);
    } else {
        $("#operationTable").find("input[name='isFHS']:eq(1)").prop("checked", true);
    }
    $("#initTable").find("#opMidori").val(rowInit["midori"]);
    $("#initTable").find("#opHS").val(rowInit["hs"]);
    if (rowInit["hasSud"] == "te") {
        $("#initTable").find("#hasSud").prop("checked", true);
    }
    $("#initTable").find("#opSud").val(Math.max(parseInt(rowInit["sud"]), SUD_MIN));
    if (rowInit["hasLift"] == "te") {
        $("#initTable").find("#hasLift").prop("checked", true);
    }
    $("#initTable").find("#opLift").val(Math.max(parseInt(rowInit["lift"]), LIFT_MIN));
    // {isFHS: isFHS, midori: midori, hs: hs, hasSud: hasSud, hasLift: hasLift, hasHid: hasHid, sud: sud, lift: lift, hid: hid}
}

function strToObj(params, paramkey) {
    let row = {};
    let arr = [];
    for (strRow of params.get(paramkey).split("r")) {
        row = {};
        for ([strVal, strKey] of zip(strRow.split("s"), params.get(paramkey+"key").split("-"))) {
            row[strKey] = strVal;
        }
        arr.push(row);
    }
    return arr;
}

function paramsToUrl() {
    let queryObj = {};
    let [dataBPMChange, _] = getDatasets();
    let dataHSChange = getHSdataset(dataBPMChange, getRaw=true);
    
    // music info
    queryObj["title"] = document.getElementById("musicTitle").value;
    // bpm
    queryObj["bpmkey"] = Object.keys(dataBPMChange[0]).join("-");
    queryObj["bpm"] = dataBPMChange.slice(0,-1).map((bar) => Object.values(bar).join("s")).join("r"); // グラフ描画用のデータを削除
    // operation
    queryObj["opkey"] = Object.keys(dataHSChange[0]).join("-");
    queryObj["op"] = dataHSChange.map((bar) => Object.values(bar).join("s")).join("r");
    // init setting
    queryObj["initkey"] = Object.keys(getInitialSetting(dataBPMChange[0]["bpm"]), getRaw=true).join("-");
    queryObj["init"] = Object.values(getInitialSetting(dataBPMChange[0]["bpm"]), getRaw=true).join("s");

    const toUrlParams = new URLSearchParams(queryObj);
    document.getElementById("generatedUrl").value = document.URL.split("?")[0] + "?" + replaceStrings(toUrlParams.toString());
}

function replaceStrings(myStr, reverse=false) {
    let full = ["false", "true", "table_fhs", "table_chs", "hs_down", "hs_up", "sud_off", "sud_on", "turntable", "hstype_change"];
    let short = ["fa", "te", "t0", "t1", "o0", "o1", "o2", "o3", "o4", "o5"];
    let src, dst;
    if (!reverse) {
        for ([src, dst] of zip(full, short)) {
            myStr = myStr.replaceAll(src, dst)
        }
    } else {
        for ([src, dst] of zip(short, full)) {
            myStr = myStr.replaceAll(src, dst)
        }
    }
    return myStr;    
}

// jQuery
$(function(){
    // プラスボタンクリック時
    $(".PlusBtn").on('click',function(){
        $(this).parent().find("table tbody tr:last-child").clone(true).appendTo($(this).parent().find("table tbody"));
        $(this).parent().find("table tbody tr:last-child").find("input[name='operationValue']").val(0);
        let newSelect, oldSelect;
        for (let nSelect=0; nSelect<$(this).parent().find("table tbody tr:last-child").find("select").length; nSelect++) {
            newSelect = $(this).parent().find("table tbody tr:last-child").find("select")[nSelect]
            oldSelect = $(this).parent().find("table tbody tr").slice(-2, -1).find("select")[nSelect]
            $(newSelect).val($(oldSelect).val())
        }
        sortTable("operationTable");
        sortTable("bpmTable");
        checkOperations();
        updateCharts();
    });
    // マイナスボタンクリック時
    $(".MinusBtn").on('click',function(){
        // 行が2行以上あればクリックされた列を削除
        if ($(this).closest("tbody").find('tr').length >= 2) {
            $(this).parents('tr').remove();
            sortTable("operationTable");
            sortTable("bpmTable");
            checkOperations();
            updateCharts();
        }
    });
    $("#genUrl").on("click", paramsToUrl)
    function switchEnableByCheck(checkId, opId) {
        if ($("#"+checkId).prop("checked") == false) {
            $("#"+opId).attr({disabled:"disabled"});
        } else {
            $("#"+opId).removeAttr("disabled");
        }
    };
    function switchEnableByRadio(radioName, opIdToEnable, opIdToDisable, otherCond=true) {
        if ($("input:radio[name='"+radioName+"']:checked").val() == "true" && otherCond) {
            $("#"+opIdToDisable).attr({disabled: "disabled"})
            $("#"+opIdToEnable).removeAttr("disabled")
        } else {
            $("#"+opIdToEnable).attr({disabled: "disabled"})
            $("#"+opIdToDisable).removeAttr("disabled")
        }
    }
    function isSudLiftChecked() {
        return $("#hasSud").prop("checked")==true || $("#hasLift").prop("checked")==true
    }
    // initialize
    switchEnableByCheck("hasSud", "opSud");
    switchEnableByCheck("hasLift", "opLift");
    switchEnableByRadio("isFHS", "opMidori", "opHS", isSudLiftChecked());
    // set event handler
    let evargs = {radioName: "isFHS",
                  opIdToE: "opMidori",
                  opIdToD: "opHS",};
    $("#hasSud").on("click", Object.assign(evargs, {checkSudId: "hasSud", opSudId: "opSud"}), function(event) {
        switchEnableByCheck(event.data.checkSudId, event.data.opSudId);
        switchEnableByRadio(event.data.radioName, event.data.opIdToE, event.data.opIdToD, isSudLiftChecked());
    });
    $("#hasLift").on("click", Object.assign(evargs, {checkLiftId: "hasLift", opLiftId: "opLift"}), function(event) {
        switchEnableByCheck(event.data.checkLiftId, event.data.opLiftId);
        switchEnableByRadio(event.data.radioName, event.data.opIdToE, event.data.opIdToD, isSudLiftChecked());
    });
    $("input:radio[name='isFHS']").on("click", evargs, function(event) {
        switchEnableByRadio(event.data.radioName, event.data.opIdToE, event.data.opIdToD, isSudLiftChecked());
    });
})

// ==================
//    Main Process
// ==================

// TODO
// 画像を表示し，ギアチェンイベントが有ることを表示する
// 表示された画像をクリックし，設定を変更できること

if (window.location.search != "") {
    try {
        urlToParams();
    } catch (e) {
        console.log("Failed to load URL Parameters.");
    }
}
// データセット設定の更新 → グラフ描画関数に内包
// var useDatasetBPM = getGraphRange({label: "BPM", yAxisKey: "bpm", color: "#ea5550", ymin: 0, ymax: 400, xmin: 0, xmax: 100});
// var useDatasetSpeed = getGraphRange({label: "緑数字", yAxisKey: "midori", color: "#37a34a", ymin: 200, ymax: 400, xmin: 0, xmax: 0});
// var useDatasetSudlift = getGraphRange({label: "Sudden+ & Lift", yAxisKey: ["sud", "lift"], color: "#ea5550", ymin: 0, ymax: 1000, xmin: 0, xmax: 100});
// var useDatasetHS = getGraphRange({label: "ハイスピード", yAxisKey: "hs", color: "#ea5550", ymin: 0, ymax: 10, xmin: 0, xmax: 100});

var bpmChart, midoriChart, sudliftChart, hsChart;
const bpmTable = document.getElementById("bpmTable");
const operationTable = document.getElementById("operationTable");
const initTable = document.getElementById("initTable");
const graphSettingTable = document.getElementById("graphSetting");
let [dataBPMChange, dataHSChange] = getDatasets();

// TODO: 描画するデータセットをチェックボックスで指定できるようにする
checkOperations();
sortTable("operationTable");
sortTable("bpmTable");
bpmChart = drawChart(dataBPMChange, canvasID="bpm");
midoriChart = drawChart(dataHSChange, canvasID="midori");
sudliftChart = drawChart(dataHSChange, canvasID="sudlift");
hsChart = drawChart(dataHSChange, cnavasID="hs");
updateCharts();
bpmTable.addEventListener(
    "change",
    function () {
        sortTable("operationTable");
        sortTable("bpmTable");
        updateCharts();}
    );
operationTable.addEventListener(
    "change",
    function () {
        sortTable("operationTable");
        sortTable("bpmTable");
        checkOperations();
        updateCharts();}
    );
initTable.addEventListener(
    "change",
    function() {
        checkOperations();
        updateCharts();}
    );
graphSettingTable.addEventListener(
    "change",
    function() {
        updateCharts();}
    );