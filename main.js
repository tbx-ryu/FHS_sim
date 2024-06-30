function updateGraph(chart, dataUpdated) {
    chart.update(dataUpdated) //TODO
}

function getBPMdataset() {
    let arrBPM = [];
    let table = document.getElementById('bpmTable');
    for (let rowNum = 1; rowNum < table.rows.length; rowNum++) { //skip header and footer(img of +)
        let row, barNum, notesType, beatNum, bpm;
        row = table.rows[rowNum]
        if(rowNum == 1) {
            row.cells["barInfo"].children["barNum"].value = 1;
            row.cells["beatInfo"].children["notesType"].value = 4;
            row.cells["beatInfo"].children["beatNum"].value = 1;
        }
        barNum = parseInt(row.cells["barInfo"].children["barNum"].value);
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
    // endの小節線情報も入れる
    arrBPM.push({x: 100, bpm: arrBPM[arrBPM.length-1].bpm});
    // TODO: 100をbarmaxに変える, barmaxがすべてのXより大きいことを保証する
    return arrBPM;
}
function getHSdataset(arrBPM) {
    let arrHS = [];
    arrHS.push(getInitialSetting(arrBPM[0].bpm));
    let sudInit = arrHS[0]["hasSud"];
    let hasLift = arrHS[0]["hasLift"];
    let table = document.getElementById('operationTable');
    for (let rowNum = 1; rowNum < table.rows.length; rowNum++) { //skip header and footer(img of +)
        let row, barNum, notesType, beatNum, operation;
        row = table.rows[rowNum]
        barNum = parseInt(row.cells["barInfo"].children["barNum"].value);
        notesType = parseInt(row.cells["beatInfo"].children["notesType"].value);
        beatNum = parseInt(row.cells["beatInfo"].children["beatNum"].value);
        // operation = "hoge"; //parseInt(row.cells["BPMInfo"].children["BPM"].value);
        operation = {hsType: row.className,
                     opType: row.cells["operation"].children["opType"].value,
                     opValue: row.cells["operation"].children["operationValue"].value}
        if(barNum && notesType && beatNum) {
            arrHS.push(calcOperation(calcTiming(barNum, notesType, beatNum), arrHS[rowNum-1], arrBPM, operation));
        }
    }
    for (let arrBPMr of arrBPM.slice(1, -1)) {
        let arrAdd = arrBPMr["x"] == 1 ?
                        structuredClone(arrHS[0]) :
                        structuredClone(arrHS.findLast(function (arrHSr) {
                                return arrHSr["x"] < arrBPMr["x"]; 
                            }));
        arrAdd["x"] = arrBPMr["x"];
        arrAdd["midori"] = calcHS2Midori(arrAdd["hs"], arrAdd["sud"], arrAdd["lift"], arrAdd["hid"], arrAdd["hasSud"], arrAdd["hasLift"], arrBPMr["bpm"]);
        arrHS.push(arrAdd);
    }
    arrHS.sort(function (a, b) {
        return a.x - b.x;
    })
    const lastHS = Object.assign({}, arrHS.slice(-1)[0]);
    lastHS.x = 100;
    arrHS.push(lastHS);
    return arrHS;
}

function calcTiming(barNum, notesType, beatNum) {
    return barNum + 1 / notesType * (beatNum - 1)
}

function getInitialSetting(iniBPM) {
    let sud, lift, hid, midori, hs;
    let hasSud = document.getElementById('hasSud').checked;
    let hasLift = document.getElementById('hasLift').checked;
    // let hasHid = document.getElementById('hasHid').checked;
    let hasHid = false;
    if(!(hasSud || hasLift || hasHid)) {
        hs = parseInt(document.getElementById('opHS').value);
        [sud, lift, hid] = [0, 0, 0];
        midori = calcHS2Midori(hs=hs, sud=sud, lift=lift, hid=hid, hasSud=hasSud, hasLift=hasLift, bpm=iniBPM);
    } else {
        sud = hasSud? parseInt(document.getElementById('opSud').value) : 0;
        lift = hasLift? parseInt(document.getElementById('opLift').value) : 0;
        hid = hasHid? parseInt(document.getElementById('opHid').value) : 0;
        if(document.getElementsByName('isFHS')[0].checked) {
            midori = parseInt(document.getElementById('opMidori').value);
            hs = calcMidori2HS(midori=midori, sud=sud, lift=lift, hid=hid, hasSud=hasSud, hasLift=hasLift, bpm=iniBPM);
        } else {
            hs = parseInt(document.getElementById('opHS').value);
            midori = calcHS2Midori(hs=hs, sud=sud, lift=lift, hid=hid, hasSud=hasSud, hasLift=hasLift, bpm=iniBPM);
        }
    }
    return {x: 1, midori: midori, memMidori:midori, sud: sud, lift: lift, hid: hid, hs: hs, hasSud: hasSud, sudInit: hasSud, hasLift: hasLift};
}

function calcOperation(x, prevArr, arrBPM, op) {
    let bpm = x==1 ? arrBPM[0]["bpm"] : arrBPM.findLast(function (bpmInfo) {
                        return bpmInfo["x"] < x; 
                        })["bpm"];
    let curArr = structuredClone(prevArr);
    curArr["x"] = x;
    if (op["opType"] == "hs_down" || op["opType"] == "hs_up") {
        // 黒鍵盤と白鍵盤
        let hsChangeVal = (op["hsType"] == "table_fhs" && curArr["hasSud"]) ? 0.5 * parseInt(op["opValue"]) : 0.25 * parseInt(op["opValue"]);
        curArr["hs"] = op["opType"] == "hs_down" ? curArr["hs"] - hsChangeVal : curArr["hs"] + hsChangeVal;
        curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
    } else if (op["opType"] == "sud_off") {
        // サドプラ外し
        curArr["hasSud"] = false;
        curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
    } else if (op["opType"] == "sud_on") {
        curArr["sudInit"] = true;
        curArr["hasSud"] = true;
        curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
    } else if (op["opType"] == "turntable"){
        // 皿回したとき
        if (op["hsType"] == "table_fhs") {
            if (curArr["hasSud"] == true) {
                curArr["sud"] += parseInt(op["opValue"]);
                curArr["hs"] = calcMidori2HS(curArr["memMidori"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
                curArr["midori"] = curArr["memMidori"];
            } else if (curArr["hasLift"] == true && op["sudInit"] == false) {
                curArr["lift"] += parseInt(op["opValue"]);
                curArr["hs"] = calcMidori2HS(curArr["memMidori"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
                curArr["midori"] = curArr["memMidori"];
            } else if (op["sudInit"] == true) {
                curArr["lift"] += parseInt(op["opValue"]);
                curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
            } else {
                curArr["hs"] += parseFloat(op["opValue"]);
                curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
            }
        } else {
            if (curArr["hasSud"] == true) {
                op["sud"] += parseInt(op["opValue"]);
            } else if (curArr["hasLift"] == true) {
                op["lift"] += parseInt(op["opValue"]);
            } else {
                console.log("nani mo nai");
            }
            curArr["midori"] = calcHS2Midori(curArr["hs"], curArr["sud"], curArr["lift"], curArr["hid"], curArr["hasSud"], curArr["hasLift"], bpm);
        }
    } else if (op["opType"] == "hstype_change" && op["hsType"] == "table_fhs") {
        curArr["memMidori"] = curArr["midori"];
    }
    return curArr; 
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
                    // right: 0,
                },
                tick: {
                    values: range(0, 100), // TODO 入力値を拾う
                    format: d3.format(".0f")
                },
                label: {
                    text: "小節数",
                }
            },
            y: {
                min: useDataset["ymin"], // TODO 入力値を拾う
                max: useDataset["ymax"], // TODO 入力値を拾う
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
        }
    });
    return chart;
}

function updateCharts(charts, useDatasets) {
    let chart, useDataset, datasets;
    let dataBPMChange = getBPMdataset();
    let dataHSChange = getHSdataset(dataBPMChange);
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
        })
    }
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
        barNum = parseInt(oldTable.rows[nRow+1].cells["barInfo"].children["barNum"].value);
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
        updateCharts([bpmChart, speedChart], [useDatasetBPM, useDatasetSpeed]);
    });
    // マイナスボタンクリック時
    $(".MinusBtn").on('click',function(){
        // 行が2行以上あればクリックされた列を削除
        if ($(this).closest("tbody").find('tr').length >= 2) {
            $(this).parents('tr').remove();
            sortTable("operationTable");
            sortTable("bpmTable");
            checkOperations();
            updateCharts([bpmChart, speedChart], [useDatasetBPM, useDatasetSpeed]);
        }
    });
// 
// 
//  開始時設定を，ページ読み込み時に更新する（非活性化や初期値の自動入力など）
//     
    function switchEnableByCheck(checkId, opId) {
        if ($("#"+checkId).prop("checked") == false) {
            $("#"+opId).attr({disabled:"disabled", "placeholder":0});
        } else {
            $("#"+opId).removeAttr("disabled placeholder");
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
    switchEnableByRadio("isFHS", "opMidori", "opHS", $("#hasSud").prop("checked")==true || $("#hasLift").prop("checked")==true);
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

// TODO
// 画像を表示し，ギアチェンイベントが有ることを表示する
// 表示された画像をクリックし，設定を変更できること

var bpmChart, speedsChart;
var useDatasetBPM = {label: "BPM", yAxisKey: "bpm", color: "#ea5550", ymin: 0, ymax: 400}; //TODO useDatasetを更新できるようにする
var useDatasetSpeed = {label: "緑数字", yAxisKey: "midori", color: "#37a34a", ymin: 200, ymax: 400};
const bpmTable = document.getElementById("bpmTable");
const operationTable = document.getElementById("operationTable");
const initTable = document.getElementById("initTable");
// let changeOperationBottun = document.getElementsByName("changeOperation")
let dataBPMChange = getBPMdataset();
let dataHSChange = getHSdataset(dataBPMChange);
// TODO: 描画するデータセットをチェックボックスで指定できるようにする
checkOperations();
sortTable("operationTable");
sortTable("bpmTable");
bpmChart = drawChart(dataBPMChange, canvasID="bpm", useDataset=useDatasetBPM, update=false);
speedChart = drawChart([{x:1, midori:290}, {x:20, midori:300}, {x:100, midori:280}], canvasID="speed", useDataset=useDatasetSpeed, update=false);
bpmTable.addEventListener(
    "change",
    function () {
        sortTable("operationTable");
        sortTable("bpmTable");
        updateCharts([bpmChart, speedChart], [useDatasetBPM, useDatasetSpeed]);}
    );
operationTable.addEventListener(
    "change",
    function () {
        sortTable("operationTable");
        sortTable("bpmTable");
        checkOperations();
        updateCharts([bpmChart, speedChart], [useDatasetBPM, useDatasetSpeed]);}
    );
initTable.addEventListener(
    "change",
    function() {
        checkOperations();
        updateCharts([bpmChart, speedChart], [useDatasetBPM, useDatasetSpeed]);}
    );