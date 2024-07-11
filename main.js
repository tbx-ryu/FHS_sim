var GRAPH_ANIME_TIME = 50; // msec

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
            row.cells["memo"].children["memoVal"].placeholder = rowAdd["memo"]
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
        [sud, lift, hid] = [0, 0, 0];
        midori = calcHS2Midori(hs=hs, sud=sud, lift=lift, hid=hid, hasSud=hasSud, hasLift=hasLift, bpm=iniBPM);
        document.getElementById('opMidori').value = parseInt(midori);
    } else {
        sud = hasSud? parseInt(document.getElementById('opSud').value) : 0;
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

function calcOperation(x, prevArr, arrBPM, op) {
    let memo;
    let bpm = x==1 ? arrBPM[0]["bpm"] : arrBPM.findLast(function (bpmInfo) {
                        return bpmInfo["x"] <= x; 
                        })["bpm"];
    let curArr = structuredClone(prevArr);
    curArr["x"] = x;
    if (op["opType"] == "hs_down" || op["opType"] == "hs_up") {
        // 黒鍵盤と白鍵盤
        let hsChangeVal = (op["hsType"] == "table_fhs" && curArr["hasSud"]) ? 0.5 * parseInt(op["opValue"]) : 0.25 * parseInt(op["opValue"]);
        curArr["hs"] = op["opType"] == "hs_down" ? curArr["hs"] - hsChangeVal : curArr["hs"] + hsChangeVal;
        curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
        memo = generateMemo(["HS"], [prevArr["hs"]], [curArr["hs"]]);
    } else if (op["opType"] == "sud_off") {
        // サドプラ外し
        curArr["hasSud"] = false;
        curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
        memo = generateMemo(["sud"], [prevArr["sud"]], [0]);
    } else if (op["opType"] == "sud_on") {
        curArr["sudInit"] = true;
        curArr["hasSud"] = true;
        curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
        memo = generateMemo(["sud"], [0], [curArr["sud"]]);
    } else if (op["opType"] == "turntable"){
        // 皿回したとき
        if (op["hsType"] == "table_fhs") {
            if (curArr["hasSud"] == true) {
                curArr["sud"] += parseInt(op["opValue"]);
                curArr["hs"] = calcMidori2HS(curArr["memMidori"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
                curArr["midori"] = curArr["memMidori"];
                memo = generateMemo(["sud", "HS"], [prevArr["sud"], prevArr["hs"]], [curArr["sud"], curArr["hs"]]);
            } else if (curArr["hasLift"] == true && curArr["sudInit"] == false) {
                curArr["lift"] += parseInt(op["opValue"]);
                curArr["hs"] = calcMidori2HS(curArr["memMidori"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
                curArr["midori"] = curArr["memMidori"];
                memo = generateMemo(["Lift", "HS"], [prevArr["lift"], prevArr["hs"]], [curArr["lift"], curArr["hs"]]);
            } else if (curArr["sudInit"] == true) {
                curArr["lift"] += parseInt(op["opValue"]);
                curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
                memo = generateMemo(["Lift", "緑数字"], [prevArr["lift"], prevArr["midori"]], [curArr["lift"], curArr["midori"]]);
            } else {
                curArr["hs"] += parseFloat(op["opValue"]);
                curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
                memo = generateMemo(["HS", "緑数字"], [prevArr["hs"], prevArr["midori"]], [curArr["hs"], curArr["midori"]]);
            }
        } else {
            if (curArr["hasSud"] == true) {
                curArr["sud"] += parseInt(op["opValue"]);
                curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
                memo = generateMemo(["sud", "緑数字"], [prevArr["sud"], prevArr["midori"]], [curArr["sud"], curArr["midori"]]);
            } else if (curArr["hasLift"] == true) {
                curArr["lift"] += parseInt(op["opValue"]);
                curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
                memo = generateMemo(["Lift", "緑数字"], [prevArr["lift"], prevArr["midori"]], [curArr["lift"], curArr["midori"]]);
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
        memoArr.push(`${param}\u003A [${preVal} => ${curVal}]`);
    }
    return memoArr.join(",");
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

function drawChart(datasets, canvasID="bpm", useDataset, update=false) {
    let chart = c3.generate({
        bindto: document.getElementById(canvasID),
        data: {
            json: datasets,
            keys: {
                x: "x",
                value: [useDataset.yAxisKey],
            },
            colors: {
                [useDataset.yAxisKey]: [useDataset.color],
            },
            types: {
                [useDataset.yAxisKey]: "step"
            },
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
                    values: range(0, (Math.ceil(useDataset["xmax"] / 10) + 1) * 10),
                    format: d3.format(".0f")
                },
                label: {
                    text: "小節数",
                }
            },
            y: {
                min: useDataset["ymin"],
                max: useDataset["ymax"],
                padding: {
                    bottom: 0,
                    top: 10,
                },
                tick: {
                    format: d3.format(".0f"),
                },
                label: {
                    text: useDataset["label"],
                }
            }
        },
        transition: {
            duration: GRAPH_ANIME_TIME,
        }, 
    });
    return chart;
}

function updateCharts(charts, useDatasets) {
    let chart, useDataset, datasets, dataBPMChange, dataHSChange;
    [dataBPMChange, dataHSChange] = getDatasets();
    let dataOp = getHSdataset(dataBPMChange, getRaw=true);
    for ([chart, useDataset, datasets] of zip(charts, useDatasets, [dataBPMChange, dataHSChange])) {
        chart.load({
            json: datasets,
            keys: {
                x: "x",
                value: [useDataset.yAxisKey],
            },
            types: {
                [useDataset.yAxisKey]: "step"
            },
            grids :{
                x: {
                    lines: [{value: 20, text: "hoge"}]
                }
            }
        })
        chart.axis.min({x: useDataset["xmin"], y: useDataset["ymin"]});
        chart.axis.max({x: useDataset["xmax"], y: useDataset["ymax"]});
        chart.internal.config.axis_x_tick_values = range(0, (Math.ceil(useDataset["xmax"] / 10 + 1) * 10));
        chart.xgrids.remove();
        // なんで縦線が一瞬出て消えるのかな…？
    }
    setTimeout(() => {
        for (chart of charts) {
            for (let op of dataOp) {
                chart.xgrids.add([{value: parseFloat(op["x"]), text: (op["opType"] + "=" + op["opValue"])}])
            }
            chart.flush();
        }}, GRAPH_ANIME_TIME + 10)
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
    let isFHS = document.getElementsByName('isFHS')[0].checked;
    let sudInit = document.getElementById('hasSud').checked;
    let cell, opType, hasSud, hasLift;
    const wSarachon = ["sud_up", "sud_down", "lift_up", "lift_down", "turntable"];
    const wOperationValue = ["hs_down", "hs_up", "sud_up", "sud_down", "lift_up", "lift_down", "turntable"];
    for (let i=1; i<tbl.rows.length; i++) {
        cell = tbl.rows[i].cells["operation"]
        if (cell.children["opType"].value == "hstype_change") {
            isFHS = !isFHS
        }
        if (isFHS){
            tbl.rows[i].className = "table_fhs";
            if (wSarachon.includes(cell.children["opType"].value)) {
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
    let i, nRow, nCol, oldTds;
    let oldTable = document.getElementById(tableId);
    let oldTbody = oldTable.getElementsByTagName("tbody")[0];
    let oldTrs = oldTbody.getElementsByTagName("tr")
    let newIdxs = new Array();
    let cellVals = new Array();

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

function updateDatasetSetting(useDataset, padding=10) {
    let axKey = useDataset["yAxisKey"];
    let BPMdataset, HSdataset
    [BPMdataset, HSdataset] = getDatasets();
    let datasets = axKey == "bpm" ? BPMdataset : HSdataset;
    let xminU = document.getElementById("xmin").value;
    let xmaxU = document.getElementById("xmax").value;
    let yminU = document.getElementById(axKey+"min").value;
    let ymaxU = document.getElementById(axKey+"max").value;
    useDataset["xmin"] = 1; // start ha itsumo 1
    useDataset["xmax"] = Math.max(parseInt(BPMdataset.slice(-1)[0]["x"]), parseInt(HSdataset.slice(-1)[0]["x"]));
    useDataset["ymin"] = parseInt(datasets[0][axKey]) - padding;
    useDataset["ymax"] = parseInt(datasets[0][axKey]) + padding ;
    for (data of datasets) {
        useDataset["xmin"] = xminU == "" ? Math.min(useDataset["xmin"], data["x"]) : parseInt(xminU);
        useDataset["xmax"] = xmaxU == "" ? Math.max(useDataset["xmax"], data["x"]) : parseInt(xmaxU);
        useDataset["ymin"] = yminU == "" ? Math.min(useDataset["ymin"], parseInt(data[axKey])-padding) : parseInt(yminU);
        useDataset["ymax"] = ymaxU == "" ? Math.max(useDataset["ymax"], parseInt(data[axKey])+padding) : parseInt(ymaxU);
    }
    useDataset["xmin"] = useDataset["xmin"] < 1 ? 1 : useDataset["xmin"];
    useDataset["ymin"] = useDataset["ymin"] < 1 ? 1 : useDataset["ymin"];
    return useDataset;
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
    $("#initTable").find("#opSud").val(rowInit["sud"]);
    if (rowInit["hasLift"] == "te") {
        $("#initTable").find("#hasLift").prop("checked", true);
    }
    $("#initTable").find("#opLift").val(rowInit["lift"]);
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

function validateInputValue() {

}

// jQuery
$(function(){
    // プラスボタンクリック時
    $(".PlusBtn").on('click',function(){
        $(this).parent().find("table tbody tr:last-child").clone(true).appendTo($(this).parent().find("table tbody"));
        let newSelect, oldSelect;
        for (let nSelect=0; nSelect<$(this).parent().find("table tbody tr:last-child").find("select").length; nSelect++) {
            newSelect = $(this).parent().find("table tbody tr:last-child").find("select")[nSelect]
            oldSelect = $(this).parent().find("table tbody tr").slice(-2, -1).find("select")[nSelect]
            $(newSelect).val($(oldSelect).val())
        }
        sortTable("operationTable");
        sortTable("bpmTable");
        checkOperations();
        updateCharts([bpmChart, speedChart], [useDatasetBPM, useDatasetSpeed], [updateDatasetSetting(useDatasetBPM), updateDatasetSetting(useDatasetSpeed)]);
    });
    // マイナスボタンクリック時
    $(".MinusBtn").on('click',function(){
        // 行が2行以上あればクリックされた列を削除
        if ($(this).closest("tbody").find('tr').length >= 2) {
            $(this).parents('tr').remove();
            sortTable("operationTable");
            sortTable("bpmTable");
            checkOperations();
            updateCharts([bpmChart, speedChart], [useDatasetBPM, useDatasetSpeed], [updateDatasetSetting(useDatasetBPM), updateDatasetSetting(useDatasetSpeed)]);
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
// データセット設定の更新
var useDatasetBPM = updateDatasetSetting({label: "BPM", yAxisKey: "bpm", color: "#ea5550", ymin: 0, ymax: 400, xmin: 0, xmax: 100});
var useDatasetSpeed = updateDatasetSetting({label: "緑数字", yAxisKey: "midori", color: "#37a34a", ymin: 200, ymax: 400, xmin: 0, xmax: 0});
var bpmChart, speedsChart;
const bpmTable = document.getElementById("bpmTable");
const operationTable = document.getElementById("operationTable");
const initTable = document.getElementById("initTable");
const graphSettingTable = document.getElementById("graphSetting");
let [dataBPMChange, dataHSChange] = getDatasets();

// TODO: 描画するデータセットをチェックボックスで指定できるようにする
checkOperations();
sortTable("operationTable");
sortTable("bpmTable");
bpmChart = drawChart(dataBPMChange, canvasID="bpm", useDataset=useDatasetBPM, update=false);
speedChart = drawChart(dataHSChange, canvasID="speed", useDataset=useDatasetSpeed, update=false);
updateCharts([bpmChart, speedChart], [updateDatasetSetting(useDatasetBPM), updateDatasetSetting(useDatasetSpeed)]);
bpmTable.addEventListener(
    "change",
    function () {
        sortTable("operationTable");
        sortTable("bpmTable");
        updateCharts([bpmChart, speedChart], [updateDatasetSetting(useDatasetBPM), updateDatasetSetting(useDatasetSpeed)]);}
    );
operationTable.addEventListener(
    "change",
    function () {
        sortTable("operationTable");
        sortTable("bpmTable");
        checkOperations();
        updateCharts([bpmChart, speedChart], [updateDatasetSetting(useDatasetBPM), updateDatasetSetting(useDatasetSpeed)]);}
    );
initTable.addEventListener(
    "change",
    function() {
        checkOperations();
        updateCharts([bpmChart, speedChart], [updateDatasetSetting(useDatasetBPM), updateDatasetSetting(useDatasetSpeed)]);}
    );
graphSettingTable.addEventListener(
    "change",
    function() {
        updateCharts([bpmChart, speedChart], [updateDatasetSetting(useDatasetBPM), updateDatasetSetting(useDatasetSpeed)]);}
    );