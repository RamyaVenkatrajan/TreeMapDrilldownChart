



// Bifrost files import
import { BifrostVisual } from "@visualbi/bifrost-powerbi/dist/BifrostVisual";
import { SelectionIdBuilder } from "@visualbi/bifrost-powerbi/dist/SelectionIdBuilder";
import { HighContrastColors } from "@visualbi/bifrost-powerbi/dist/types/BifrostTypeDef";
import * as Categorical from '@visualbi/bifrost-powerbi/dist/types/DataTypeDef';
import { Data } from "@visualbi/bifrost-powerbi/dist/types/DataTypeDef";
import { SettingsSchemaTypeDef } from "@visualbi/bifrost-powerbi/dist/types/SettingsSchemaTypeDef";
import { UIIndicators } from '@visualbi/bifrost-powerbi/dist/UIIndicators';
import { HighchartSelectionManager } from "@visualbi/powerbi-common/dist/HighChartUtils/selection";
import { BifrostDataUtils } from '@visualbi/powerbi-common/dist/Utils/bifrostDataUtils';
import { throws } from "assert";
import { settings } from "cluster";
import "core-js/stable";
import customEvents from "highcharts-custom-events/js/customEvents";
// HighChart files import
import * as Highcharts from "highcharts/highcharts";
import highchartsMore from "highcharts/highcharts-more";
import boost from "highcharts/modules/boost";
import exportData from "highcharts/modules/export-data";
import exporting from "highcharts/modules/exporting";
import offlineExporting from "highcharts/modules/offline-exporting";
import wordcloud from "highcharts/modules/wordcloud";
// Power BI files import
import powerbiVisualsApi from "powerbi-visuals-api";
// Common files import
import {
    COMPONENT_NAME, COMPONENT_URL, CUSTOMER_NAME, LICENSE_KEY, VISUAL_VERSION
} from "../licence";
import "./../style/visual.less";
import { EnumConfig } from "./enumConfig";
import { ValidValues, VisualSettings } from "./settings";
import { TreeMapDrilldownUtil } from "./TreeMapDrilldownUtil";
//import { Editor } from "@visualbi/powerbi-editor/dist/conditional-formatting/editor";
import { FieldsMeta } from "./types/types";

import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;

boost(Highcharts);
exporting(Highcharts);
exportData(Highcharts);
highchartsMore(Highcharts);
offlineExporting(Highcharts);
wordcloud(Highcharts);
customEvents(Highcharts);

const debounce = require("lodash.debounce");
//import { TreeMapDrilldownChartSelection } from "./TreeMapDrilldownChartSelection";
const escape = require("lodash.escape");

export class TreeMapDrilldownChart extends BifrostVisual.BifrostVisual {
    private element: HTMLElement;
    private highcharts: any;
    private chartSetting: any;
    private chartSetting2: any;
    public chartRef: Highcharts.Chart;
    public chartRef2: Highcharts.Chart;
    private enumConfig: EnumConfig;
    public _isPBIApplication: boolean;
    public _isMSBrowser: boolean;
    public fieldsMeta: FieldsMeta;
    public _selectionIdBuilder: SelectionIdBuilder;
    public hcSelectionManager: HighchartSelectionManager;
    public seriesData: any;
    public isProPropertiesUsed: boolean;
    public isFilterRedraw: boolean;
    public isSetDataUsed: boolean;
    public _isPBIMobile: boolean;
    public bifrostData: Data;
    private maxlength = 0;
    private chartfilter = [];
    private chartfilter1 = [];
    private wrappercontainer=[];
    public tabwidth: any;
    constructor(options: VisualConstructorOptions) {
        super(options, VisualSettings, ValidValues);
        console.log("OPTIONS", options);
        this.highcharts = Highcharts;
        this.isProPropertiesUsed = false;
        // this.Editor = Editor;
        this.initComponent(this.render, {
            getSettingsUIConfiguration: this.getEnumerationConfiguration,
            isMeasureComponent: true,
            resizeHandler: {
                callBack: () => {
                    let optionsWidth = options.element.offsetWidth * 0.75;
                    let clientHeight1 = document.getElementById('tabs').clientHeight;
                     this.tabwidth = document.getElementById('tabs').clientWidth;
                 
                    let clientHeight = clientHeight1 - 40;
                    if (this.chartfilter.length > 0) {
                        for (let i = 0; i < this.chartfilter.length; i++) {
                            this.chartfilter[i][0].setSize(optionsWidth, clientHeight / this.chartfilter.length, false);
                        }
                    }
                    if (this.chartfilter1.length > 0) {
                        for (let i = 0; i < this.chartfilter1.length; i++) {
                            this.chartfilter1[i][0].setSize(optionsWidth, clientHeight / this.chartfilter1.length, false);
                        }
                    }
                    
                    let conatinerdiv = this.wrappercontainer[0][0];
                    let tithide = conatinerdiv.querySelector('#titlediv');
                    let chartparentcontainer = conatinerdiv.querySelector('#chartcontainer');
                    console.log("chartparentcontainer",chartparentcontainer)

                    if(this.tabwidth <=250){
                        tithide.classList.add('title');
                        chartparentcontainer.classList.add('reswidth');
                    }else if(this.tabwidth > 250){
                        tithide.classList.remove('title');
                        chartparentcontainer.classList.remove('reswidth');
                        this.chartRef.reflow();
                    }
                },
                timeOut: 0,
            },
            mergeProps: [
                {
                    role: "category",
                    dimensionIndex: 0,
                    properties: [
                        {
                            section: "dataPoint",
                            name: "fill",
                            dimensionSection: "dataPoint",
                        },
                    ],
                },
            ],
            license: {
                VISUAL_VERSION,
                COMPONENT_NAME,
                LICENSE_KEY,
                CUSTOMER_NAME,
            },
            // propProperties: ProProperties,
            skipLicenseCheck: true,

            landingPageConfig: {
                title: COMPONENT_NAME,
                url: COMPONENT_URL,
            },
            fullScreenEditor: false,
            editor: false,
        });
    }
    private getEnumerationConfiguration = (): SettingsSchemaTypeDef.Section[] => {
        this.enumConfig = new EnumConfig(this.maxlength);
        return this.enumConfig.getEnumerationConfigurationArray(this);
    };
    
    public render({
        data,
        element,
        selectionIdBuilder,
        settings,
        sampleVisual,
        isPBIDesktop,
        isPBIMobile,
        isMSBrowser,
    }: {
        data: Data;
        element: HTMLElement;
        selectionIdBuilder: SelectionIdBuilder;
        settings: VisualSettings;
        sampleVisual: boolean;
        isPBIDesktop: boolean;
        isPBIMobile: boolean;
        isMSBrowser: boolean;
        measureValueIndex: number;
    }) {
        if (sampleVisual) {
            this.generateSampleVisual(element);
            return;
        } else {
            this.getFieldsMeta(data);
            this._isPBIApplication = isPBIDesktop || isPBIMobile;
            this._isMSBrowser = isMSBrowser;
            this._isPBIMobile = isPBIMobile;
            this.hcSelectionManager = new HighchartSelectionManager(selectionIdBuilder);
            this.generateData(data, element, selectionIdBuilder, settings);
            selectionIdBuilder.registerOnSelectCallback(() => {
            });
            if (selectionIdBuilder.getSelectionIds().length > 0 && this.chartRef) {

            }
        }
    }

    private getFieldsMeta(data: Data) {
        this.fieldsMeta = {
            hasCategory: false,
            hasValues1: false,
            hasValues3: false,
            hasPercentageValues: false,
            hastooltips: false,
            countValues1: 0,
            countValues3: 0,
        };
        data.metadata.dimensions.forEach((dimMeta) => {
            if (dimMeta.role["category"]) {
                this.fieldsMeta.hasCategory = true;
            }
        });
        data.metadata.measures.forEach((mesMeta) => {
            if (mesMeta.role["Values1"]) {
                this.fieldsMeta.hasValues1 = true;
                this.fieldsMeta.countValues1++;
            }
            if (mesMeta.role["Values3"]) {
                this.fieldsMeta.hasValues3 = true;
                this.fieldsMeta.countValues3++;
            }
            if (mesMeta.role["PercentageValues"])
                this.fieldsMeta.hasPercentageValues = true;
        });
    }

    private generateData(
        data: Data,
        element: HTMLElement,
        selectionIdBuilder: SelectionIdBuilder,
        settings: VisualSettings,
    ) {
        try {
            console.log("Data", data);
            this.chartfilter = [], this.chartfilter1 = [], this.wrappercontainer =[];
            
            let seriesData = this.GET_SERIES(data, settings, selectionIdBuilder, this.hcSelectionManager);
            const tabs = document.createElement('div');
            const charttitle = document.createElement('div');
            const spantitle = document.createElement('span');
            const spanpercentvalue = document.createElement('span')
            const ul = document.createElement('ul');
            const first_li = document.createElement('li');
            const second_li = document.createElement('li');
            const div1 = document.createElement('div');
            const tabl1div = document.createElement('div');
            const tabl2div = document.createElement('div');
            // create id
            tabs.className = 'tabs';
            tabs.id = 'tabs';
            if (settings.chartOptions.chartshow !== false) {
                // Chart title Options
                charttitle.id = 'charttitle';
                spantitle.id = 'spantitle';
                spanpercentvalue.id = 'spanpercentvalue';
                spantitle.innerHTML = (settings.chartOptions.chartshow == true) ? settings.chartOptions.charttitle : settings.chartOptions.charttitle = '';
                charttitle.style.fontFamily = settings.chartOptions.fontfamily;
                charttitle.style.fontSize = settings.chartOptions.fontSize + "px";
                charttitle.style.fontWeight = settings.chartOptions.fontWeight;
                spantitle.style.color = settings.chartOptions.fontColor;
                spanpercentvalue.style.color = settings.chartOptions.percentvalfontColor;
                charttitle.style.textAlign = settings.chartOptions.textAlign;
            }
            if (settings.chartOptions.chartshow && spantitle.innerHTML == '') {
                spantitle.innerHTML = 'Sample';
            }
            ul.id = 'tabs-list';
            first_li.className = 'active';
            // Tabs title Options
            first_li.innerHTML = settings.tabtitleOptions.tabtext1;
            second_li.innerHTML = settings.tabtitleOptions.tabtext2;

            if (first_li.innerHTML == '') {
                first_li.innerHTML = 'Tab 1';
            }
            if (second_li.innerHTML == '') {
                second_li.innerHTML = 'Tab 2';
            }
            tabl1div.id = 'tab1';
            tabl1div.className = 'active';
            tabl2div.id = 'tab2';

            first_li.style.color = settings.tabtitleOptions.tabfontColor;
            first_li.style.fontFamily = settings.tabtitleOptions.tabfontfamily;
            first_li.style.fontSize = settings.tabtitleOptions.tabfontSize + "px";
            first_li.style.borderBottomColor = settings.tabtitleOptions.borderbottomColor;
            second_li.style.color = settings.tabtitleOptions.tabfontColor;
            second_li.style.fontSize = settings.tabtitleOptions.tabfontSize + "px";
            second_li.style.borderBottomColor = settings.tabtitleOptions.borderbottomColor;
            second_li.style.fontFamily = settings.tabtitleOptions.tabfontfamily;
            // Append
            tabs.appendChild(charttitle);
            charttitle.appendChild(spantitle);
            charttitle.appendChild(spanpercentvalue);
            tabs.appendChild(ul);
            ul.appendChild(first_li);
            ul.appendChild(second_li);
            tabs.appendChild(tabl1div);
            tabs.appendChild(tabl2div);
            const errorElement = document.getElementById("tabs");
            if (errorElement != null) {
                errorElement.parentNode.removeChild(errorElement);
                element.appendChild(tabs);
            } else {
                element.appendChild(tabs);
            }
            // ADD EVENT LISTENER
            first_li.onclick = () => {
                tabl2div.classList.remove('active');
                tabl1div.classList.add('active');
                first_li.classList.add('active');
                second_li.classList.remove('active');
            }
            second_li.onclick = () => {
                tabl1div.classList.remove('active');
                tabl2div.classList.add('active');
                first_li.classList.remove('active');
                second_li.classList.add('active');
                tabl1div.style.display = 'none';
            }

            if (settings.chartOptions.chartshow !== false && this.fieldsMeta.hasPercentageValues) {
                const percentval = data.categorical.measures.find(function (item) {
                    return (item.role["PercentageValues"])
                });
                let decpercent = '';
                if (percentval.values[0] >= 1) {
                    decpercent = Math.round(percentval.values[0]).toString() + '%';

                } else if (percentval.values[0] > 0 && percentval.values[0] < 1) {
                    console.log("percentval.values[0]", percentval.values[0]);
                    let parsevalue = (percentval.values[0] * 100).toFixed(settings.chartOptions.percentDecimal) + '%';
                    console.log("parsevalue", parsevalue);
                    decpercent = parsevalue;

                } else if (percentval.values[0] == 0) {
                    decpercent = percentval.values[0].toString() + '%';
                }
                if (percentval.values[0] == null) {
                    UIIndicators.showErrorMessage(tabs, "Invalid percentage value data. Please add valid value");
                    var taberror = document.querySelector('.info-container');
                    taberror.classList.add('percenterror');
                    tabs.insertBefore(taberror, tabs.childNodes[0]);
                }
                const percent = (settings.chartOptions.chartshow == true && this.fieldsMeta.hasPercentageValues) ? decpercent : '';
                spanpercentvalue.innerHTML = percent.toString();
            }
            var Values1 = seriesData.filter(function (item) {
                return (item.role["Values1"])
            });

            let filtermeeasure = data.categorical.measures.filter(f => f.role["Values1"]);
            let filtervalues = filtermeeasure.map(function (e, i) {
                return e.values;
            })
            let somefilter = filtervalues.some(item => (item[0] === null && item[1] === null) || (item.length == 0) || (item[0] === undefined && item[1] === undefined));

            let filtermeeasure2 = data.categorical.measures.filter(f => f.role["Values3"]);
            let filtervalues2 = filtermeeasure2.map(function (e, i) {
                return e.values;
            })
            let somefilter2 = filtervalues2.some(item => (item[0] === null && item[1] === null) || (item.length == 0) || (item[0] === undefined && item[1] === undefined));

            if (!this.fieldsMeta.hasCategory) {
                UIIndicators.showErrorMessage(tabs, "Please add Category value",);
                var taberror = document.querySelector('.info-container');
                tabs.insertBefore(taberror, tabs.childNodes[0]);
            }
            else {
                if (!this.fieldsMeta.hasValues1) {
                    UIIndicators.showErrorMessage(tabl1div, "Please add appropriate Tab 1 value data");
                } else if (somefilter) {
                    UIIndicators.showErrorMessage(tabl1div, "Invalid data.Please add valid value",);
                }
                else {
                    const wrapper = document.createElement('div');
                    const container = document.createElement('div');
                    const titlediv = document.createElement('div');
                    const chartcontainer = document.createElement('div');

                    // create id
                    wrapper.className = 'wrapper';
                    container.className = 'container'
                    titlediv.id = 'titlediv';
                    chartcontainer.className = 'chartcontainer';
                    chartcontainer.id = 'chartcontainer';

                    // create rectangle element
                    var rectwrapper = document.createElement('div');
                    rectwrapper.className = 'rectwrapper';
                    var canvas1 = document.createElement('canvas1');
                    canvas1.className = 'canvas';
                    canvas1.style.backgroundColor = 'transparent';
                    var canvas2 = document.createElement('canvas2');
                    canvas2.className = 'canvas1';
                    canvas2.style.backgroundColor = settings.chartOptions.bandBgshow ? settings.chartOptions.bandBg : 'transparent';

                    // append child
                    wrapper.appendChild(container);
                    container.appendChild(titlediv);
                    container.appendChild(chartcontainer);
                    chartcontainer.appendChild(rectwrapper);
                    rectwrapper.appendChild(canvas1);
                    rectwrapper.appendChild(canvas2);
                    tabl1div.appendChild(wrapper);

                    const headertext1 = document.createElement('div');
                    const headertext2 = document.createElement('div');
                    headertext1.className = 'headertext';
                    headertext2.className = 'headertext';
                    canvas1.appendChild(headertext1);
                    canvas2.appendChild(headertext2);

                    headertext1.innerHTML = data.categorical.dimensions[0].values[0];
                    headertext2.innerHTML = data.categorical.dimensions[0].values[1];

                    const Value1label = Values1.map(v => v.name)
                    let clientHeight = document.getElementById('tab1').offsetHeight;
                    let chartHeight = clientHeight / (Values1.length / 2);
                    let clientwidth1 = document.getElementById('tabs').offsetWidth;
                    let minusdiv = document.getElementById('titlediv').offsetWidth ? document.getElementById('titlediv').offsetWidth :0;
                    console.log("minusdiv",minusdiv);
                    var newwidth = clientwidth1 - minusdiv;
                    let tithide = document.querySelector('#titlediv');
                    let chartparentcontainer = document.querySelector('#chartcontainer');
                    console.log("chartparentcontainer",chartparentcontainer);

                    for (let i = 0; i < Values1.length / 2; i++) {
                        const titledivsub = document.createElement('div');
                        const subcontainerOne = document.createElement('div');
                        if(clientwidth1 > 250){
                            titledivsub.className = `titledivsub-${i}`;
                            titlediv.appendChild(titledivsub);
                            titledivsub.innerHTML = `<p>${Value1label[i]}</p>`
                            subcontainerOne.className = `subcontainerOne-${i}`;
                            subcontainerOne.style.height = chartHeight + "px";
                            subcontainerOne.style.width = newwidth + "px";
                            chartcontainer.appendChild(subcontainerOne);
                            tithide.classList.remove('title');
                            chartparentcontainer.classList.remove('reswidth');
                        }else{
                            tithide.classList.add('title');
                            chartparentcontainer.classList.add('reswidth');
                            subcontainerOne.className = `subcontainerOne-${i}`;
                            subcontainerOne.style.height = chartHeight + "px";
                            subcontainerOne.style.width = clientwidth1 + "px";
                            chartcontainer.appendChild(subcontainerOne);
                        }
                  

                        this.chartSetting = TreeMapDrilldownUtil.getDefaultValues(this, settings, data, selectionIdBuilder, seriesData, i, true);
                        this.chartRef = this.highcharts.chart(subcontainerOne, this.chartSetting);
                        this.chartfilter[i] = [];
                        this.chartfilter[i].push(this.chartRef);
                        this.wrappercontainer[i] = [];
                        this.wrappercontainer[i].push(container)
                        
                    }
                   
                }
            }
            const errorMessageElement2 = document.getElementById("vbi-error-message");
            if (errorMessageElement2 != null) {
                errorMessageElement2.parentNode.removeChild(errorMessageElement2);
            }
            var Values3 = seriesData.filter(function (item) {
                return (item.role["Values3"])
            });

            if (!this.fieldsMeta.hasCategory) {
                UIIndicators.showErrorMessage(tabs, "Please add Category value",);
                var taberror = document.querySelector('.info-container');
                tabs.insertBefore(taberror, tabs.childNodes[0]);
            }
            else {
                if (!this.fieldsMeta.hasValues3) {
                    UIIndicators.showErrorMessage(tabl2div, "Please add appropriate Tab 2 value data");
                } else if (somefilter2) {
                    UIIndicators.showErrorMessage(tabl2div, "Invalid data.Please add valid value",);
                }
                else {
                    const wrapper = document.createElement('div');
                    const container = document.createElement('div');
                    const titlediv = document.createElement('div');
                    const chartcontainer = document.createElement('div');
                    // create id
                    wrapper.className = 'wrapper';
                    container.className = 'container'
                    titlediv.id = 'titlediv';
                    chartcontainer.className = 'chartcontainer';
                    chartcontainer.id = 'chartcontainer';
                    // create rectangle element
                    var rectwrapper = document.createElement('div');
                    rectwrapper.className = 'rectwrapper';
                    var canvas1 = document.createElement('canvas1');
                    canvas1.className = 'canvas';
                    canvas1.style.backgroundColor = 'transparent';
                    var canvas2 = document.createElement('canvas2');
                    canvas2.className = 'canvas1';
                    canvas2.style.backgroundColor = settings.chartOptions.bandBgshow ? settings.chartOptions.bandBg : 'transparent';
                    // append child
                    wrapper.appendChild(container);
                    container.appendChild(titlediv);
                    container.appendChild(chartcontainer);
                    chartcontainer.appendChild(rectwrapper);
                    rectwrapper.appendChild(canvas1);
                    rectwrapper.appendChild(canvas2);
                    tabl2div.appendChild(wrapper);

                    const headertext3 = document.createElement('div');
                    const headertext4 = document.createElement('div');
                    headertext3.className = 'headertext';
                    headertext4.className = 'headertext';
                    canvas1.appendChild(headertext3);
                    canvas2.appendChild(headertext4);

                    if (isNaN(parseInt(data.categorical.dimensions[0].values[0]))) {
                        headertext3.innerHTML = data.categorical.dimensions[0].values[0];
                    } else {
                        const tab2offsetvalue = parseInt(data.categorical.dimensions[0].values[0]) - 1;
                        headertext3.innerHTML = tab2offsetvalue.toString();
                    }
                    if (isNaN(parseInt(data.categorical.dimensions[0].values[1]))) {
                        headertext4.innerHTML = data.categorical.dimensions[0].values[1];
                    } else {
                        const tab2offsetvalue2 = parseInt(data.categorical.dimensions[0].values[1]) - 1;
                        headertext4.innerHTML = tab2offsetvalue2.toString();
                    }
                    const Value3label = Values3.map(v => v.name)
                    let clientHeight1 = document.getElementById('tabs').offsetHeight;
                    let clientwidth1 = document.getElementById('tabs').offsetWidth;
                    let minusdiv1 = document.getElementById('titlediv');
                    let chartHeight1 = clientHeight1 / (Values3.length / 2);
                    for (let i = 0; i < Values3.length / 2; i++) {
                        const titledivsub = document.createElement('div');
                        titledivsub.className = `titledivsub-${i}`;
                        titlediv.appendChild(titledivsub);
                        titledivsub.innerHTML = `<p>${Value3label[i]}</p>`
                        const subcontainerOne = document.createElement('div');
                        subcontainerOne.className = `subcontainerOne-${i}`;
                        subcontainerOne.style.height = chartHeight1 + "px";
                        subcontainerOne.style.width = newwidth + "px";
                        chartcontainer.appendChild(subcontainerOne);
                        this.chartSetting2 = TreeMapDrilldownUtil.getDefaultValues(this, settings, data, selectionIdBuilder, seriesData, i, false);
                        this.chartRef2 = this.highcharts.chart(subcontainerOne, this.chartSetting2);
                        this.chartfilter1[i] = [];
                        this.chartfilter1[i].push(this.chartRef2);
                    }
                }
            }
            var activeTab = document.querySelector('.error-indicator');
            var activeNextSibling = activeTab.nextElementSibling;
            activeNextSibling.insertBefore(errorMessageElement2, activeNextSibling.childNodes[0]);
        } catch (e) {
            console.log("error", e);
        }
    }

    private getNumberFormattingSettings(numberFormatSettings: any, settings: VisualSettings) {
        let noOfDecimal, scalingFactor, prefix, suffix;
        if (numberFormatSettings && numberFormatSettings.showMeasureLabel) {
            scalingFactor = numberFormatSettings.scalingFactor != undefined ? numberFormatSettings.scalingFactor : 'none';
            noOfDecimal = numberFormatSettings.noOfDecimal != undefined ? numberFormatSettings.noOfDecimal : 2;
            suffix = numberFormatSettings.suffix != undefined ? numberFormatSettings.suffix : '';
            prefix = numberFormatSettings.prefix != undefined ? numberFormatSettings.prefix : '';
        }
        else {
            noOfDecimal = settings.numberformat.dlNoOfDecimal;
            scalingFactor = settings.numberformat.dlScalingFactor;
            prefix = settings.numberformat.dlPrefix;
            suffix = settings.numberformat.dlSuffix;
        }
        return { noOfDecimal, prefix, suffix, scalingFactor }
    }

    private GET_SERIES(data: Data, settings: VisualSettings, selectionIdBuilder: SelectionIdBuilder, hcSelectionManager: HighchartSelectionManager) {
        const dataViewCategories = data.categorical.dimensions;
        const selectionIdsLength = selectionIdBuilder.getSelectionIds().length;
        const metadata = data.metadata, objects = data.categorical.objects;
        const dataViewMeasures = data.categorical.measures;
        const valueMeasures = dataViewMeasures.filter(dataViewMeasure => dataViewMeasure.role.Values1 || dataViewMeasure.role.Values3);
        let selectiondata = [], seriesData = [];
        for (let measureIndex = 0; measureIndex < valueMeasures.length; measureIndex++) {
            const series = [];
            const measureName = valueMeasures[measureIndex].name;
            const dataViewMeasure = valueMeasures[measureIndex];
            const measureValues = valueMeasures[measureIndex].values;
            const dataViewMeasureObject: Categorical.Objects = BifrostDataUtils.GETMEASUREOBJECTS(
                objects,
                dataViewMeasure.name
            );
            const dataViewMeasureObjectSettings = dataViewMeasureObject.settings;
            const numberFormatSettings = dataViewMeasureObjectSettings && dataViewMeasureObjectSettings.numberformat;
            const { noOfDecimal, scalingFactor, prefix, suffix } = this.getNumberFormattingSettings(numberFormatSettings, settings);
            measureValues.forEach((element, index) => {
                const categoriesObject = {};
                const categoryIndex = [], catagoryMemberIndex = [];
                dataViewCategories.forEach((categories, catagoryIndex) => {
                    categoriesObject[categories.id] = categories.values[index];
                    categoryIndex.push(catagoryIndex);
                    catagoryMemberIndex.push(index);
                });
                const selectionId = selectionIdBuilder.getSelectionId({
                    'measureName': measureName,
                    'categoricalIndex': categoryIndex,
                    'categoricalMemberIndex': catagoryMemberIndex
                });
                const isPointSelected = hcSelectionManager.isSelected(dataViewMeasure, index, selectionId);
                const seriesData = {
                    key: element,
                    index,
                    id: categoriesObject,
                    selectionId, className: isPointSelected ? 'fade-out' : '',
                    manualSelect: isPointSelected ? false : (selectionIdsLength === 0 ? undefined : true),
                    isInteger: dataViewMeasure.isInteger,
                    scalingFactor, prefix, suffix, noOfDecimal, autoScalingFactor: dataViewMeasure.scalingFactor,
                    ruleKey: dataViewMeasure.ruleKeys && dataViewMeasure.ruleKeys[index] ? dataViewMeasure.ruleKeys[index] : null,
                    cfApplied: true,
                    ispercentagepoint: scalingFactor == "100" ? true : false,
                    role: dataViewMeasure.role,
                    dataLabels: {
                        enabled: settings.dataLabels.show,
                        shadow: false,
                        style: {
                            fontSize: settings.dataLabels.dlfontSize + 'px',
                            fontWeight: (dataViewMeasure.role.Values1 == true && (dataViewMeasure.values[1] || dataViewMeasure.values[1] == 0)) || (dataViewMeasure.role.Values3 == true && (dataViewMeasure.values[1] || dataViewMeasure.values[1] == 0)) ? settings.dataLabels.currentdlfontWeight : settings.dataLabels.dlFontWeight,
                            color: settings.dataLabels.dlfontColor,
                            textShadow: false,
                            textOutline: false
                        },
                    },
                    y: measureValues[index],
                }
                series.push(seriesData);
            });
            const seriesItem = <any>{
                type: "line",
                turboThreshold: 0,
                zIndex: measureIndex === 0 ? 100 : 0,
                marker: {
                    symbol: settings.markerOption.markerSymbol
                },
                selectionId: selectionIdBuilder.getSelectionId({ 'measureName': dataViewMeasure.name }),
                name: BifrostDataUtils.GETMEASURELABELFROMNAME(data.metadata, dataViewMeasures[measureIndex].name),
                data: series,
                key: valueMeasures[measureIndex].id,
                role: valueMeasures[measureIndex].role,
            }
            seriesData.push(seriesItem);
        }
        return seriesData;
    }
    
    private getResponsiveChart(  data: Data,
        element: HTMLElement,
           selectionIdBuilder: SelectionIdBuilder,
        settings: VisualSettings,
        ){
          this.generateData(data,element,selectionIdBuilder,settings);
          
           

    }
    public generateSampleVisual(element) {
        const lpChartSettings: any = {
            chart: {
                type: "line",
            },
            legend: {
                enabled: false
            },
            title: {
                text: "",
            },
            yAxis: {
                title: {
                    text: "",
                },
                labels: {
                    enabled: false,
                }
            },
            xAxis: {
                title: {
                    text: "",
                },
                labels: {
                    enabled: false,
                },
                categories: ["2020", "2021"],
            },
            tooltip: {
                valuePrefix: "$",
                enabled: false
            },
            credits: {
                enabled: false,
            },
            plotOptions: {
                series: {
                    cursor: "pointer",
                },
            },
            series: [
                {
                    name: "Eligible Purchase",
                    data: [814612, 1037469],
                    dashStyle: "Dash",
                },
                {
                    name: "Y/Y Growth",
                    data: [2020203, 69000],
                    dashStyle: "Dash",
                }
            ],
        };
        this.highcharts.chart(element, lpChartSettings);
    }
}
