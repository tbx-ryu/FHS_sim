function updateGraph(chart, dataUpdated) {
    chart.update(dataUpdated) //TODO
}

function getBPMdataset() {
    let arrBPM = [];
    let table = document.getElementById('bpmTable');
    for (let rowNum = 1; rowNum < table.rows.length; rowNum++) { //skip header
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
            arrBPM.push({x: barNum+1/notesType*(beatNum-1), bpm: bpm})
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
    // TODO: ユーザが追加したHS変更情報を取得する処理をつくる
    arrHS.sort(function (a, b) {
        return a.x - b.x;
    })
    const lastHS = Object.assign({}, arrHS.slice(-1)[0]);
    lastHS.x = 100;
    arrHS.push(lastHS);
    return arrHS;
}
function getInitialSetting(iniBPM) {
    let sud, lift, hid, midori, hs;
    let hasSud = document.getElementById('hasSud').checked;
    let hasLift = document.getElementById('hasLift').checked;
    // let hasHid = document.getElementById('hasHid').checked;
    let hasHid = false;
    if(!(hasSud || hasLift || hasHid)) {
        hs = document.getElementById('opHS').value;
        [sud, lift, hid] = [0, 0, 0];
        midori = calcHS2Midori(hs=hs, sud=sud, lift=lift, hid=hid, bpm=iniBPM);
    } else {
        sud = hasSud? parseInt(document.getElementById('opSud').value) : 0;
        lift = hasLift? parseInt(document.getElementById('opLift').value) : 0;
        hid = hasHid? parseInt(document.getElementById('opHid').value) : 0;
        if(document.getElementsByName('isFHS')[0].checked) {
            midori = parseInt(document.getElementById('opMidori').value);
            hs = calcMidori2HS(midori=midori, sud=sud, lift=lift, hid=hid, bpm=iniBPM);
        } else {
            hs = parseInt(document.getElementById('opHS').value);
            midori = calcHS2Midori(hs=hs, sud=sud, lift=lift, hid=hid, bpm=iniBPM);
        }
    }
    return {x: 1, midori: midori, sud: sud, lift: lift, hid: hid, hs: hs};
}

function calcHS2Midori(hs, sud, lift, hid, bpm, baseMidori=348000) {
    // console.log(sud)
    return (baseMidori/(bpm*hs)*(1-(sud+hid+lift)/1000))/2 // diveded by 2 because Lightning Model
}
function calcMidori2HS(midori, sud, lift, hid, bpm, baseMidori=348000) {
    return (baseMidori/(bpm*midori)*(1-(sud+hid+lift)/1000))/2 // diveded by 2 because Lightning Model
}

function inputChange(){
    // if (bpmChart) {bpmChart.destroy();}
    // if (speedsChart) {speedsChart.destroy();}
    // let dataBPMChange = getBPMdataset();
    // let dataHSChange = getHSdataset(dataBPMChange);
    // drawChart(dataBPMChange, canvasID="bpm", useDatasets=[{label: "BPM", yAxisKey: "bpm", color: "#ff5c5c"},]);
    // drawChart(dataHSChange, canvasID="speeds", useDatasets=[{label: "緑数字", yAxisKey: "midori", color:"#7fff7a"},]);
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
            types: {
                [useDataset.yAxisKey]: "step"
            },
        },
        line: {
            step: {
                type: "step-after",
            },
        },
        axis: {
            x: {
                min: 2,
                tick: {
                    values: range(0, 100),
                }
            }
        }
    });
    return {chart};
}

// HS操作に更新があった際，各タイミングでFHSかCHSか確認する
function checkOperations() {
    const tbl = document.getElementById("operationTable");
    // const textSarachon = document.getElementById("textSarachon");
    // const operationValue = document.getElementById("operationValue")
    let isFHS = document.getElementsByName('isFHS')[0].checked;
    let cell;
    const wSarachon = ["sud_up", "sud_down", "lift_up", "lift_down"];
    const wOperationValue = ["hs_down", "hs_up", "sud_up", "sud_down", "lift_up", "lift_down"];
    for (let i=1; i<tbl.rows.length; i++) {
        cell = tbl.rows[i].cells["Operation"]
        if (cell.children["OpType"].value == "hstype_change") {
            isFHS = !isFHS
        }
        if (isFHS){
            tbl.rows[i].className = "table_fhs";
            if (wSarachon.includes(cell.children["OpType"].value)) {
                cell.children["textSarachon"].hidden = false;
            } else {
                cell.children["textSarachon"].hidden = true;
            }
        } else {
            tbl.rows[i].className = "table_chs";
            cell.children["textSarachon"].hidden = true;
            cell.children["operationValue"].hidden = true;
        }
        if (wOperationValue.includes(cell.children["OpType"].value)) {
            cell.children["operationValue"].hidden = false;
        } else {
            cell.children["operationValue"].hidden = true;
        }
    }
}

function range(start, stop, step=10) {
    return Array.from({ length: (stop - start) / step + 1}, (_, i) => start + i * step);
}

// jQuery
//*********************************************//
//***************table-management**************//
//*********************************************//
$(function(){
    p_tableDnD();
    // プラスボタンクリック時
    $(".PlusBtn").on('click',function(){
        $(this).parent().find("table tbody tr:first-child").clone(true).appendTo($(this).parent().find("table tbody"));
        $(this).parent().find("table tbody tr:last-child td input").val("");
        checkOperations();
        p_tableDnD();
    });
    // マイナスボタンクリック時
    $(".MinusBtn").on('click',function(){
        // 行が2行以上あればクリックされた列を削除
        if ($(".table-management tbody tr").length >= 2) {
            $(this).parents('tr').remove();
            checkOperations();
            p_tableDnD();
        }
    });
// ドラッグアンドドロップ制御
    function p_tableDnD(){
        $(".tableBody").sortable({
            handle: ".handle"
        });
    }
});

// TODO
// 画像を表示し，ギアチェンイベントが有ることを表示する
// 表示された画像をクリックし，設定を変更できること

let bpmChart, speedsChart;
const bpmTable = document.getElementById("bpmTable");
const operationTable = document.getElementById("operationTable");
const initTable = document.getElementById("initTable");
let changeOperationBottun = document.getElementsByName("changeOperation")
let dataBPMChange = getBPMdataset();
let dataHSChange = getHSdataset(dataBPMChange);
// TODO: 描画するデータセットをチェックボックスで指定できるようにする
// useDatasets = ["使うデータセット"]
checkOperations();
operationTable.addEventListener("change", checkOperations)
initTable.addEventListener("change", checkOperations)
// changeOperationBottun.addEventListener("click". checkOperations)
// drawChart(dataBPMChange, canvasID="bpm", useDatasets=[{label: "BPM", yAxisKey: "bpm", color: "#ff5c5c"}], update=false);
// drawChart(dataHSChange, canvasID="speeds", useDatasets=[{label: "緑数字", yAxisKey: "midori", color:"#7fff7a"}], update=false);
bpmChart = drawChart(dataBPMChange, canvasID="bpm", useDataset={label: "BPM", yAxisKey: "bpm", color: "#ff5c5c"}, update=false);
speedChart = drawChart([{x:1, midori:290}, {x:20, midori:300}, {x:100, midori:280}], canvasID="speed", useDataset={label: "緑数字", yAxisKey: "midori", color: "#7fff7a"}, update=false);
