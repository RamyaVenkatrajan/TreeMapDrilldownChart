import * as BifrostVisual from '@visualbi/bifrost-powerbi/dist/BifrostVisual';
import { RenderOptions } from '@visualbi/bifrost-powerbi/dist/types/BifrostTypeDef';
import { SelectionIdBuilder } from "@visualbi/bifrost-powerbi/dist/SelectionIdBuilder";
import { HighContrastColors } from "@visualbi/bifrost-powerbi/dist/types/BifrostTypeDef";
import * as Categorical from '@visualbi/bifrost-powerbi/dist/types/DataTypeDef';
import { Data } from "@visualbi/bifrost-powerbi/dist/types/DataTypeDef";
import * as SettingsSchemaTypeDef from '@visualbi/bifrost-powerbi/dist/types/SettingsSchemaTypeDef';
import { UIIndicators } from '@visualbi/bifrost-powerbi/dist/UIIndicators';
import { HighchartSelectionManager } from "@visualbi/powerbi-common/dist/HighChartUtils/selection";
import { BifrostDataUtils } from '@visualbi/powerbi-common/dist/Utils/bifrostDataUtils';
import { throws } from "assert";
import { integer } from "aws-sdk/clients/cloudfront";
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
const escape = require("lodash.escape");

export class TreeMapDrilldownChart extends BifrostVisual.BifrostVisual {
    private highcharts: any;
    private chartSetting: any;
    private chartSetting2: any;
    public chartRef: Highcharts.Chart;
    public chartRef2: Highcharts.Chart;
    public chartRef3: Highcharts.Chart;
    public chartRef4: Highcharts.Chart;
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
    private slideIndex = 1;
    private _data: Data;
    private _settings: VisualSettings;
    public _element: HTMLElement;
    private __selectionIdBuilder: SelectionIdBuilder;
    public __isPBIMobile: boolean;
    public isInFocus: boolean;

    constructor(options: VisualConstructorOptions) {
        super(options, VisualSettings, ValidValues);
        this.highcharts = Highcharts;
        this.isProPropertiesUsed = false;
        // this.Editor = Editor;
        this.initComponent(this.render, {
            getSettingsUIConfiguration: this.getEnumerationConfiguration,
            isMeasureComponent: true,
            resizeHandler: {
                callBack: () => {
                    this.responsiveChart(this._data, this._element, this.__selectionIdBuilder, this._settings, this.__isPBIMobile);
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
        this.enumConfig = new EnumConfig();
        return this.enumConfig.getEnumerationConfigurationArray(this);
    };
    public render({ data, element, selectionIdBuilder, settings, sampleVisual, isPBIDesktop, isPBIMobile, isMSBrowser }: {
        data: Data;
        element: HTMLElement;
        selectionIdBuilder: SelectionIdBuilder;
        settings: VisualSettings;
        sampleVisual: boolean;
        isPBIDesktop: boolean;
        isPBIMobile: boolean;
        isMSBrowser: boolean;
    }) {

        if (sampleVisual) {
            this.generateSampleVisual(element);
            return;
        } else {
             console.log("data", data);
            this._data = data; this._element = element; this._settings = settings;
            this.__selectionIdBuilder = selectionIdBuilder; this.__isPBIMobile = this._isPBIMobile;
            this.getFieldsMeta(data);
            this._isPBIApplication = isPBIDesktop || isPBIMobile;
            this._isMSBrowser = isMSBrowser;
            this._isPBIMobile = isPBIMobile;
            this.hcSelectionManager = new HighchartSelectionManager(selectionIdBuilder);
            this.responsiveChart(data, element, selectionIdBuilder, settings, isPBIMobile);
            selectionIdBuilder.registerOnSelectCallback(() => {
            });
            if (selectionIdBuilder.getSelectionIds().length > 0 && this.chartRef) {
            }
        }
    }

    private getFieldsMeta(data: Data) {
        this.fieldsMeta = {
            hasCategory: false,
            hasBusinessUnit: false,
            hasValues1: false,
            hasValues3: false,
            hasPercentageValues: false,
            hasParentName: false,
            hasAccount: false,
            hasAccountType: false,
            hasSalesManager: false,
            hasBenefitlevel: false,
            hastooltips: false,
            countValues1: 0,
            countValues3: 0,
        };
        data.metadata.dimensions.forEach((dimMeta) => {
            if (dimMeta.role["category"]) {
                this.fieldsMeta.hasCategory = true;
            }
        });

        data.categorical['groupDimension'].forEach((dimMeta) => {
            if (dimMeta.role["category"]) {
                this.fieldsMeta.hasCategory = true;
            }
        });

        data.metadata.dimensions.forEach((dimMeta) => {
            if (dimMeta.role["BusinessUnit"]) {
                this.fieldsMeta.hasBusinessUnit = true;
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

            if (mesMeta.role["parentname"])
                this.fieldsMeta.hasParentName = true;

            if (mesMeta.role["account"])
                this.fieldsMeta.hasAccount = true;

            if (mesMeta.role["accounttype"])
                this.fieldsMeta.hasAccountType = true;

            if (mesMeta.role["salesmanager"])
                this.fieldsMeta.hasSalesManager = true;

            if (mesMeta.role["benefitlevel"])
                this.fieldsMeta.hasBenefitlevel = true;

        });
    }

    private generateData(data: Data, element: HTMLElement, selectionIdBuilder: SelectionIdBuilder, settings: VisualSettings, carouselstate: string, index: integer,
        charttab1series: integer, charttab2series: integer) {
        try {
            let seriesData = this.getSeries(data, settings, selectionIdBuilder, this.hcSelectionManager);
            const tabs_container = document.createElement('div');
            const tabs = document.createElement('div');
            const ul = document.createElement('ul');
            const first_li = document.createElement('li');
            const second_li = document.createElement('li');
            const tabl1div = document.createElement('div');
            const tabl2div = document.createElement('div');
            // Create id 
            tabs_container.id = `tabs_container${index}`;
            tabs.className = 'tabs';
            tabs.id = 'tabs';
            ul.id = 'tabs-list';
            first_li.className = 'active';
            // Tabs title Options
            if (index == data.categorical.dimensions[0].values.indexOf('RASP')) {
                first_li.innerHTML = settings.tabtitleOptions.chart1tabtext1;
                second_li.innerHTML = settings.tabtitleOptions.chart1tabtext2;
            } else if (index == data.categorical.dimensions[0].values.indexOf('CAS')) {
                first_li.innerHTML = settings.tabtitleOptions.chart2tabtext1;
                second_li.innerHTML = settings.tabtitleOptions.chart2tabtext2;
            } else if (index == data.categorical.dimensions[0].values.indexOf('PAS')) {
                first_li.innerHTML = settings.tabtitleOptions.chart3tabtext1;
                second_li.innerHTML = settings.tabtitleOptions.chart3tabtext2;
            }
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
            // Percentage value calculation
            this.sharePercentCalc(data, settings, element, tabs, index);
            // Append child divs to parent div
            tabs.appendChild(ul);
            ul.appendChild(first_li);
            ul.appendChild(second_li);
            tabs.appendChild(tabl1div);
            tabs.appendChild(tabl2div);
            tabs_container.appendChild(tabs);
            const errorElement = document.getElementById(`tabs_container`);
            if (errorElement != null) {
                errorElement.parentNode.removeChild(errorElement);
                element.appendChild(tabs_container);
            } else {
                element.appendChild(tabs_container);
            }
            // Add Event Listener
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
            let Values1 = seriesData.filter(function (item) {
                return (item.role["Values1"])
            });
            let Values3 = seriesData.filter(function (item) {
                return (item.role["Values3"])
            });
            // Checking for invalid Data
            let filtermeeasure = data.categorical.measures.filter(f => f.role["Values1"]);
            let filtervalues = filtermeeasure.map(function (e, i) {
                return e.values;})
            let somefilter = filtervalues.every(item => (item[0] === null) || (item[0] === undefined));
            let filtermeeasure2 = data.categorical.measures.filter(f => f.role["Values3"]);
            let filtervalues2 = filtermeeasure2.map(function (e, i) {
                return e.values;})
            let somefilter2 = filtervalues2.every(item => (item[0] === null) || (item[0] === undefined));
            // Chart width calculation
            var widowwidth = document.getElementById('slideshowcontainer').offsetWidth;
            var actual_width, newactualwidth, chartists;
            if (widowwidth <= 600) {
                actual_width = ((widowwidth) * 25);
                newactualwidth = (actual_width / 100);
                chartists = (widowwidth) - newactualwidth;
            } else if (widowwidth > 600 && widowwidth <= 1100) {
                actual_width = ((widowwidth) * 65);
                newactualwidth = (actual_width / 100);
                chartists = (widowwidth) - newactualwidth;
            } else if (this._isPBIMobile) {
                actual_width = ((widowwidth) * 25);
                newactualwidth = (actual_width / 100);
                chartists = (widowwidth) - newactualwidth;
            }
            else {
                actual_width = ((widowwidth / 3) * 25);
                newactualwidth = (actual_width / 100);
                chartists = ((widowwidth / 3) - newactualwidth) - 30;
            }
            //  Tab 1 chart series
            if (!this.fieldsMeta.hasValues1) {
                UIIndicators.showErrorMessage(tabl1div, "Please add appropriate Tab 1 value data", null);
                document.getElementById("vbi-error-message").removeAttribute('id');
            } else if (somefilter) {
                UIIndicators.showErrorMessage(tabl1div, "Invalid data.Please add valid value", null);
                document.getElementById("vbi-error-message").removeAttribute('id');
            }
            else {
                const wrapper = document.createElement('div');
                const container = document.createElement('div');
                const titlediv = document.createElement('div');
                const chartcontainer = document.createElement('div');
                const versioncontainer = document.createElement('div');
                // create id
                wrapper.className = 'wrapper';
                container.className = 'container'
                titlediv.id = 'titlediv';
                chartcontainer.className = 'chartcontainer';
                chartcontainer.id = 'chartcontainer';
                versioncontainer.className = 'versioncontainer';
                // create canvas background
                let rectwrapper = document.createElement('div');
                rectwrapper.className = 'rectwrapper';
                var canvas1 = document.createElement('canvas1');
                canvas1.className = 'canvas';
                canvas1.style.backgroundColor = 'transparent';
                var canvas2 = document.createElement('canvas2');
                canvas2.className = 'canvas1';
                canvas2.style.backgroundColor = settings.chartOptions.bandBgshow ? settings.chartOptions.bandBg : 'transparent';
                // Append child
                wrapper.appendChild(container);
                container.appendChild(titlediv);
                container.appendChild(chartcontainer);
                chartcontainer.appendChild(rectwrapper);
                chartcontainer.appendChild(versioncontainer);
                rectwrapper.appendChild(canvas1);
                rectwrapper.appendChild(canvas2);
                tabl1div.appendChild(wrapper);
                // Tab 1 version year text 
                this.currentVersionYearCalc(data, versioncontainer)
                // Plot chart
                const Value1label = Values1.map(v => v.name)
                let clientHeight = document.getElementById('tab1').offsetHeight;
                let chartHeight, vllength;
                let totallength = (Values1.length) / 2;
                if (data.categorical['groupDimension'][0].values.length > 1 && (totallength >= charttab1series)) {
                    chartHeight = clientHeight / charttab1series;
                    vllength = charttab1series;
                } else if (data.categorical['groupDimension'][0].values.length > 1 && (totallength < charttab1series)) {
                    chartHeight = clientHeight / (Values1.length / 2);
                    vllength = (Values1.length) / 2;
                }
                for (let i = 0; i < vllength; i++) {
                    const titledivsub = document.createElement('div');
                    const subcontainerOne = document.createElement('div');
                    titledivsub.className = `titledivsub-${i}`;
                    titlediv.appendChild(titledivsub);
                    titledivsub.innerHTML = `<p>${Value1label[i]}</p>`
                    if (i > 2 && (i == ((totallength) - 1) && (index == data.categorical.dimensions[0].values.indexOf('RASP') || index == data.categorical.dimensions[0].values.indexOf('CAS')))) {
                        titledivsub.style.visibility = 'hidden'
                    }
                    subcontainerOne.className = `subcontainerOne-${i}`;
                    subcontainerOne.style.height = chartHeight + "px";
                    subcontainerOne.style.width = chartists + "px";
                    chartcontainer.appendChild(subcontainerOne);
                    this.chartSetting = TreeMapDrilldownUtil.getDefaultValues(this, settings, data, selectionIdBuilder, seriesData, i, true, index);
                    this.chartRef = this.highcharts.chart(subcontainerOne, this.chartSetting);
                }
            }
            // Tab 2 chart series
            if (!this.fieldsMeta.hasValues3) {
                UIIndicators.showErrorMessage(tabl2div, "Please add appropriate Tab 2 value data");
                document.getElementById("vbi-error-message").removeAttribute('id');
            } else if (somefilter2) {
                UIIndicators.showErrorMessage(tabl2div, "Invalid data.Please add valid value",);
                document.getElementById("vbi-error-message").removeAttribute('id');
            }
            else {
                const wrapper1 = document.createElement('div');
                const container1 = document.createElement('div');
                const titlediv1 = document.createElement('div');
                const chartcontainer1 = document.createElement('div');
                const versioncontainer1 = document.createElement('div');
                // create id
                wrapper1.className = 'wrapper';
                container1.className = 'container'
                titlediv1.id = 'titlediv';
                chartcontainer1.className = 'chartcontainer';
                chartcontainer1.id = 'chartcontainer';
                versioncontainer1.className = 'versioncontainer';
                // create canvas background
                let rectwrapper1 = document.createElement('div');
                rectwrapper1.className = 'rectwrapper';
                var canvas1 = document.createElement('canvas1');
                canvas1.className = 'canvas';
                canvas1.style.backgroundColor = 'transparent';
                var canvas2 = document.createElement('canvas2');
                canvas2.className = 'canvas1';
                canvas2.style.backgroundColor = settings.chartOptions.bandBgshow ? settings.chartOptions.bandBg : 'transparent';
                // append child
                wrapper1.appendChild(container1);
                container1.appendChild(titlediv1);
                container1.appendChild(chartcontainer1);
                chartcontainer1.appendChild(rectwrapper1);
                chartcontainer1.appendChild(versioncontainer1);
                rectwrapper1.appendChild(canvas1);
                rectwrapper1.appendChild(canvas2);
                tabl2div.appendChild(wrapper1);
                // Tab 2 version year text 
                this.PreviousVersionYearCalc(data, versioncontainer1);
                // Plot graph
                const Value3label = Values3.map(v => v.name)
                let clientHeight1 = document.getElementById('tabs').offsetHeight;
                let totallength2 = Values3.length;
                let chartHeight1, vllength1;
                if (data.categorical['groupDimension'][0].values.length > 1 && (totallength2 >= charttab2series)) {
                    chartHeight1 = clientHeight1 / charttab2series;
                    vllength1 = charttab2series;
                } else if(data.categorical['groupDimension'][0].values.length > 1 && (totallength2 < charttab2series)) {
                    chartHeight1 = clientHeight1 / (Values3.length);
                    vllength1 = Values3.length;
                }
                for (let i = 0; i < vllength1; i++) {
                    const titledivsub = document.createElement('div');
                    titledivsub.className = `titledivsub-${i}`;
                    titlediv1.appendChild(titledivsub);
                    titledivsub.innerHTML = `<p>${Value3label[i]}</p>`;
                    if (i > 2 && (i == ((totallength2) - 1) && (index == data.categorical.dimensions[0].values.indexOf('RASP') || index == data.categorical.dimensions[0].values.indexOf('CAS')))) {
                        titledivsub.style.visibility = 'hidden'
                    }
                    const subcontainerOne = document.createElement('div');
                    subcontainerOne.className = `subcontainerOne-${i}`;
                    subcontainerOne.style.height = chartHeight1 + "px";
                    subcontainerOne.style.width = chartists + "px";
                    chartcontainer1.appendChild(subcontainerOne);
                    this.chartSetting2 = TreeMapDrilldownUtil.getDefaultValues(this, settings, data, selectionIdBuilder, seriesData, i, false, index);
                    this.chartRef2 = this.highcharts.chart(subcontainerOne, this.chartSetting2);
                }
            }
            // check for carousel or scroll 
            let tbcontainer1 = document.querySelector('.slideshowcontainer');
            let slide_container = document.querySelector('.slider_Content');
            if (carouselstate) {
                let mySlides = document.createElement('div');
                mySlides.className = 'mySlides';
                slide_container.appendChild(mySlides);
                mySlides.appendChild(tabs_container);
            } else {
                tbcontainer1.appendChild(tabs_container);
            }
        } catch (e) {
            console.log("error", e);
        }
    }

    private getNumberFormattingSettings(numberFormatSettings: any, settings: VisualSettings) {
        let noOfDecimal, scalingFactor, prefix, suffix;
        if (numberFormatSettings && numberFormatSettings.showMeasureLabel) {
            scalingFactor = numberFormatSettings.scalingFactor != undefined ? numberFormatSettings.scalingFactor : '100';
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

    private getSeries(data: Data, settings: VisualSettings, selectionIdBuilder: SelectionIdBuilder, hcSelectionManager: HighchartSelectionManager) {
        let screenwidth = window.innerHeight;
        const dataViewCategories = data.categorical.dimensions;
        const selectionIdsLength = selectionIdBuilder.getSelectionIds().length;
        const metadata = data.metadata, objects = data.categorical.objects;
        const dataViewMeasures = data.categorical.measures;
        const valueMeasures = dataViewMeasures.filter(dataViewMeasure => dataViewMeasure.role.Values1 || dataViewMeasure.role.Values3);
        let seriesData = [];
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
                    ispercentagepoint: Object.values(categoriesObject).includes('RASP') && scalingFactor == "100" ? true : false,
                    role: dataViewMeasure.role,
                    dataLabels: {
                        enabled: screenwidth > 300 ? settings.dataLabels.show : !settings.dataLabels.show,
                        shadow: false,
                        style: {
                            fontSize: settings.dataLabels.dlfontSize + 'px',
                            fontWeight: measureIndex >= (valueMeasures.length / 2) ? settings.dataLabels.currentdlfontWeight : settings.dataLabels.dlFontWeight,
                            color: settings.dataLabels.dlfontColor,
                            textShadow: false,
                            textOutline: false,
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

    private headerdetails(data: Data, settings: VisualSettings) {
        var screensize = window.innerWidth;
        const parentfilter = data.categorical.measures.filter(item => item.role["parentname"]);
        const accountfilter = data.categorical.measures.filter(item => item.role["account"]);
        const accounttypefilter = data.categorical.measures.filter(item => item.role["accounttype"]);
        const salesmanagerfilter = data.categorical.measures.filter(item => item.role["salesmanager"]);
        const benefitlevelfilter = data.categorical.measures.filter(item => item.role["benefitlevel"]);
        const parentelement = document.getElementById('slideshowcontainer');
        const headerElement = document.createElement("div");
        headerElement.setAttribute("id", "headerbar");
        const parentname = document.createElement("p");
        parentname.classList.add("parentname");
        //parentname. className = 'accordion active';
        const detailElement = document.createElement("div");
        detailElement.classList.add("account_details");
        const accountelement = document.createElement("div");
        accountelement.classList.add("acc_ele");
        const accountelementlabel = document.createElement("p");
        const accountelementtext = document.createElement("p");
        const accounttype = document.createElement("div");
        accounttype.classList.add("acc_type");
        const accounttypelabel = document.createElement("p");
        const accounttypetext = document.createElement("p");
        const salesmanager = document.createElement("div");
        salesmanager.classList.add("salesmanager_type");
        const salesmanagerlabel = document.createElement("p");
        const salesmanagertext = document.createElement("p");
        const benefitlevel = document.createElement("div");
        benefitlevel.classList.add("benefitlevel_type");
        const benefitlevellabel = document.createElement("p");
        const benefitleveltext = document.createElement("p");
        //styles for header elements
        parentname.style.color = settings.headerOptions.headerfontColor;
        parentname.style.fontSize = screensize <= 600 || this._isPBIMobile ? (settings.headerOptions.headerfontSize * 0) + 20 + 'px' : settings.headerOptions.headerfontSize + 'px';
        parentname.style.fontWeight = settings.headerOptions.headerfontWeight;
        parentname.style.fontFamily = settings.headerOptions.headerfontfamily;
        //style sub header label elements
        accountelementlabel.style.color = settings.headerOptions.labelfontcolor;
        accountelementlabel.style.fontSize = settings.headerOptions.labelfontSize + 'px';
        accountelementlabel.style.fontWeight = settings.headerOptions.labelfontWeight;
        accountelementlabel.style.fontFamily = settings.headerOptions.headerfontfamily;
        accounttypelabel.style.color = settings.headerOptions.labelfontcolor;
        accounttypelabel.style.fontSize = settings.headerOptions.labelfontSize + 'px';
        accounttypelabel.style.fontWeight = settings.headerOptions.labelfontWeight;
        accounttypelabel.style.fontFamily = settings.headerOptions.headerfontfamily;
        salesmanagerlabel.style.color = settings.headerOptions.labelfontcolor;
        salesmanagerlabel.style.fontSize = settings.headerOptions.labelfontSize + 'px';
        salesmanagerlabel.style.fontWeight = settings.headerOptions.labelfontWeight;
        salesmanagerlabel.style.fontFamily = settings.headerOptions.headerfontfamily;
        benefitlevellabel.style.color = settings.headerOptions.labelfontcolor;
        benefitlevellabel.style.fontSize = settings.headerOptions.labelfontSize + 'px';
        benefitlevellabel.style.fontWeight = settings.headerOptions.labelfontWeight;
        benefitlevellabel.style.fontFamily = settings.headerOptions.headerfontfamily;
        //style sub header value elements
        accountelementtext.style.color = settings.headerOptions.valuefontcolor;
        accountelementtext.style.fontSize = settings.headerOptions.valuefontSize + 'px';
        accountelementtext.style.fontWeight = settings.headerOptions.valuefontWeight;
        accountelementtext.style.fontFamily = settings.headerOptions.headerfontfamily;
        accounttypetext.style.color = settings.headerOptions.valuefontcolor;
        accounttypetext.style.fontSize = settings.headerOptions.valuefontSize + 'px';
        accounttypetext.style.fontWeight = settings.headerOptions.valuefontWeight;
        accounttypetext.style.fontFamily = settings.headerOptions.headerfontfamily;
        salesmanagertext.style.color = settings.headerOptions.valuefontcolor;
        salesmanagertext.style.fontSize = settings.headerOptions.valuefontSize + 'px';
        salesmanagertext.style.fontWeight = settings.headerOptions.valuefontWeight;
        salesmanagertext.style.fontFamily = settings.headerOptions.headerfontfamily;
        benefitleveltext.style.color = settings.headerOptions.benefitlevelcolor;
        benefitleveltext.style.fontSize = settings.headerOptions.valuefontSize + 'px';
        benefitleveltext.style.fontWeight = settings.headerOptions.valuefontWeight;
        benefitleveltext.style.fontFamily = settings.headerOptions.headerfontfamily;

        parentname.innerHTML = this.fieldsMeta.hasParentName ? (parentfilter[0].values[0]).toString() : 'Sample'
        accountelementlabel.innerHTML = 'Account #';
        accountelementtext.innerHTML = this.fieldsMeta.hasAccount ? (accountfilter[0].values[0]).toString() : 'Sample'
        accounttypelabel.innerHTML = 'Account Type';
        accounttypetext.innerHTML = this.fieldsMeta.hasAccountType ? (accounttypefilter[0].values[0]).toString() : 'Sample';
        salesmanagerlabel.innerHTML = 'Sales Manager';
        salesmanagertext.innerHTML = this.fieldsMeta.hasSalesManager ? (salesmanagerfilter[0].values[0]).toString() : 'Sample';
        // benefitleveltext.innerHTML = this.fieldsMeta.hasBenefitlevel ? (benefitlevelfilter[0].values[0]).toString() :'Sample' ;
        if (this.fieldsMeta.hasBenefitlevel) {
            if ((benefitlevelfilter[0].values[0]).toString() === '' || (benefitlevelfilter[0].values[0]).toString() === 'Select' || (benefitlevelfilter[0].values[0]).toString() === 'Not assigned') {
                benefitleveltext.style.display = 'none'
                benefitlevellabel.style.display = 'none'
            } else {
                benefitlevellabel.innerHTML = new Date().getFullYear() + ' Benefit Level';
                benefitleveltext.innerHTML = (benefitlevelfilter[0].values[0]).toString();
            }
        } else if (!this.fieldsMeta.hasBenefitlevel) {
            benefitlevellabel.innerHTML = 'Benefit Level';
            benefitleveltext.innerHTML = 'Sample'
        }
        //append div
        headerElement.appendChild(parentname);
        headerElement.appendChild(detailElement);
        detailElement.appendChild(accountelement);
        detailElement.appendChild(accounttype);
        detailElement.appendChild(salesmanager);
        detailElement.appendChild(benefitlevel);
        accountelement.appendChild(accountelementlabel);
        accountelement.appendChild(accountelementtext);
        accounttype.appendChild(accounttypelabel);
        accounttype.appendChild(accounttypetext);
        salesmanager.appendChild(salesmanagerlabel);
        salesmanager.appendChild(salesmanagertext);
        benefitlevel.appendChild(benefitlevellabel);
        benefitlevel.appendChild(benefitleveltext);
        parentelement.insertBefore(headerElement, parentelement.children[0]);
        // add accordion
        if (screensize > 600) {
            parentname.className = 'accordion active ms-Icon ms-Icon--ChevronUpSmall';
        } else if (screensize <= 600 || this._isPBIMobile) {
            parentname.className = 'accordion active ms-Icon ms-Icon--ChevronDownSmall';
        }

        var acc = document.querySelector<HTMLElement>(".accordion")!;
        acc.addEventListener("click", event => {
            acc.classList.toggle("active");
            var panel = <HTMLElement>acc.nextElementSibling;
            if (screensize > 600) {
                if (acc.classList.contains('active')) {
                    panel.style.display = "block";
                    parentname.classList.add('ms-Icon--ChevronUpSmall');
                    parentname.classList.remove('ms-Icon--ChevronDownSmall');
                } else {
                    parentname.classList.remove('ms-Icon--ChevronUpSmall');
                    parentname.classList.add('ms-Icon--ChevronDownSmall');
                    panel.style.display = "none";
                }
            } else if (screensize <= 600 || this._isPBIMobile) {
                if (acc.classList.contains('active')) {
                    panel.style.display = "block";
                    parentname.classList.add('ms-Icon--ChevronDownSmall');
                    parentname.classList.remove('ms-Icon--ChevronRightSmall');
                } else {
                    parentname.classList.remove('ms-Icon--ChevronDownSmall');
                    parentname.classList.add('ms-Icon--ChevronRightSmall');
                    // parentname.className.replace('ms-Icon--ChevronUpSmall', 'ms-Icon--ChevronDownSmall');
                    panel.style.display = "none";
                }
            }

        });
    }

    private responsiveChart(data: Data, element: HTMLElement, selectionIdBuilder: SelectionIdBuilder, settings: VisualSettings, isPBIMobile: boolean) {
        try {

            // check for Category and Business unit 
            if (!this.fieldsMeta.hasCategory) {
                this.emptyElement(element);
                UIIndicators.showErrorMessage(element, "Please add Category value", null);
                document.getElementById("vbi-error-message").removeAttribute('id');
                return false;
            } if (!this.fieldsMeta.hasBusinessUnit) {
                this.emptyElement(element);
                UIIndicators.showErrorMessage(element, "Please add Business unit", null);
                document.getElementById("vbi-error-message").removeAttribute('id');
                return false;
            }

            
            let charview = [];
            for (let j = 0; j < data.categorical.dimensions[0].values.length; j++) {
                charview[j] = data.categorical.dimensions[0].values.indexOf(settings.chartOptions['chart' + (j + 1)]);
            }
            const varcheck = document.getElementById('slideshowcontainer');
            const slideshowcontainer = document.createElement('div');
            slideshowcontainer.className = 'slideshowcontainer';
            slideshowcontainer.id = 'slideshowcontainer';
            if (varcheck) {
                varcheck.replaceWith(slideshowcontainer);
                element.appendChild(slideshowcontainer);
            } else {
                element.appendChild(slideshowcontainer);
            }
            const slider_Content = document.createElement('div');
            slider_Content.className = 'slider_Content';
            slideshowcontainer.appendChild(slider_Content);

            
            var screenwidth = window.innerWidth;
            if (this._isPBIMobile) {
                this.removeInfoElement(element);
                slider_Content.remove();
                this.setSwitchFocusModeState(true);
                let scrollbtn = settings.responsiveOptions.scrollshow;
                const prev = document.querySelector('.prev')
                if (prev != null) {
                    prev.parentNode.removeChild(prev);
                }
                const next = document.querySelector('.next')
                if (next != null) {
                    next.parentNode.removeChild(next);
                }
                document.getElementById('slideshowcontainer').className += ' scrollbar'
                for (let l = 0; l < data.categorical.dimensions[0].values.length; l++) {
                    this.generateData(data, element, selectionIdBuilder, settings, null, charview[l], settings.chartOptions['chart' + (l + 1) + 'kpi1'], settings.chartOptions['chart' + (l + 1) + 'kpi2']);
                }
            } else if (screenwidth <= 600) {
                this.removeInfoElement(element);
                // for slider mobile responsive
                document.getElementById('slideshowcontainer').className += ' Slider'
                for (let l = 0; l < data.categorical.dimensions[0].values.length; l++) {
                    this.generateData(data, element, selectionIdBuilder, settings, 'mySlides', charview[l], settings.chartOptions['chart' + (l + 1) + 'kpi1'], settings.chartOptions['chart' + (l + 1) + 'kpi2']);
                }
                const prev = document.createElement('a');
                const next = document.createElement('a');
                prev.className = 'prev ms-Icon ms-Icon--ChevronLeftSmall';
                next.className = 'next ms-Icon ms-Icon--ChevronRightSmall';
                slider_Content.appendChild(prev);
                slider_Content.appendChild(next);
                prev.addEventListener("click", event => {
                    this.plusSlides(-1);
                })
                next.addEventListener("click", event => {
                    this.plusSlides(1);
                })
                this.showSlides(this.slideIndex);
            }
            else if (screenwidth > 600 && screenwidth <= 1100) {
                slider_Content.remove();
                this.removeInfoElement(element);
                const prev = document.querySelector('.prev')
                if (prev != null) {
                    prev.parentNode.removeChild(prev);
                }
                const next = document.querySelector('.next')
                if (next != null) {
                    next.parentNode.removeChild(next);
                }
                // for scroll responsive - mid devices
                document.getElementById('slideshowcontainer').className += ' scrollbar mid'
                for (let l = 0; l < data.categorical.dimensions[0].values.length; l++) {
                    this.generateData(data, element, selectionIdBuilder, settings, null, charview[l], settings.chartOptions['chart' + (l + 1) + 'kpi1'], settings.chartOptions['chart' + (l + 1) + 'kpi2']);
                }
            }
            else {
                slider_Content.remove();
                this.removeInfoElement(element);
                for (let l = 0; l < data.categorical.dimensions[0].values.length; l++) {
                    this.generateData(data, element, selectionIdBuilder, settings, null, charview[l], settings.chartOptions['chart' + (l + 1) + 'kpi1'], settings.chartOptions['chart' + (l + 1) + 'kpi2']);
                }
            }
            this.headerdetails(data, settings);
        }
        catch (e) {
            console.log("error", e);
        }
    }

    private plusSlides(n) {
        this.showSlides(this.slideIndex += n);
    }

    private showSlides(n) {
        let i;
        let slides = document.getElementsByClassName("mySlides") as HTMLCollectionOf<HTMLElement>;
        if (n > slides.length) { this.slideIndex = 1 }
        if (n < 1) { this.slideIndex = slides.length }
        for (i = 0; i < slides.length; i++) {
            slides[i].style.display = "none";
            slides[i].className = slides[i].className.replace(" active", "");
        }
        slides[this.slideIndex - 1].style.display = "block";
        slides[this.slideIndex - 1].className += " active";
    }

    public emptyElement(element: HTMLElement) {
        while (element.hasChildNodes()) {
            element.removeChild(element.lastChild);
        }
    }

    public removeInfoElement(element: HTMLElement) {
        const errorcont1 = document.querySelector('.info-container')
        if (errorcont1 != null) {
            errorcont1.parentNode.removeChild(errorcont1);
        }
    }

    private sharePercentCalc(data: Data, settings: VisualSettings, element: HTMLElement, insertingElement, business: integer) {
        const spanpercentvalue = document.createElement('span');
        const chattily = document.createElement('div');
        const spantitle = document.createElement('span');
        insertingElement.appendChild(chattily);
        chattily.appendChild(spantitle);
        chattily.appendChild(spanpercentvalue);
        if (settings.chartOptions.chartshow !== false) {
            // Chart title Options
            chattily.id = 'charttitle';
            spantitle.id = 'spantitle';
            spanpercentvalue.id = 'spanpercentvalue';
            if (business == data.categorical.dimensions[0].values.indexOf('RASP')) {
                spantitle.innerHTML = (settings.chartOptions.chartshow == true) && settings.chartOptions.charttitle.length > 0 ? settings.chartOptions.charttitle : settings.chartOptions.charttitle = 'Residential';
            } else if (business == data.categorical.dimensions[0].values.indexOf('CAS')) {
                spantitle.innerHTML = (settings.chartOptions.chartshow == true) && settings.chartOptions.charttitle2.length > 0 ? settings.chartOptions.charttitle2 : settings.chartOptions.charttitle2 = 'Commercial';
            } else if (business == data.categorical.dimensions[0].values.indexOf('PAS')) {
                spantitle.innerHTML = (settings.chartOptions.chartshow == true) && settings.chartOptions.charttitle3.length > 0 ? settings.chartOptions.charttitle3 : settings.chartOptions.charttitle3 = 'Gates';
            }
            chattily.style.fontFamily = settings.chartOptions.fontfamily;
            chattily.style.fontSize = settings.chartOptions.fontSize + "px";
            chattily.style.fontWeight = settings.chartOptions.fontWeight;
            spantitle.style.color = settings.chartOptions.fontColor;
            spanpercentvalue.style.color = settings.chartOptions.percentvalfontColor;
            chattily.style.textAlign = settings.chartOptions.textAlign;
        }
        if (settings.chartOptions.chartshow !== false && this.fieldsMeta.hasPercentageValues && this.fieldsMeta.hasCategory) {
            const percentval = data.categorical.measures.filter(function (item) {
                return (item.role["PercentageValues"])
            });
            let percentValue;
            if (percentval.length > 1) {
                percentValue = percentval[1].values[business];
            } else {
                percentValue = percentval[0].values[business];
            }
            let decpercent = '';
            if (percentValue == 1) {
                decpercent = (percentValue * 100).toString() + '%';

            } else if (percentValue > 1 && percentValue < 100) {
                decpercent = (percentValue * 100).toFixed(settings.chartOptions.percentDecimal) + '%';
            } else if (percentValue >= 100) {
                decpercent = (percentValue).toString() + '%';
            }
            else if (percentValue < 0) {
                decpercent = (percentValue * 100).toFixed(settings.chartOptions.percentDecimal) + '%';
            }
            else if (percentValue > 0 && percentValue < 1) {
                let parsevalue = (percentValue * 100).toFixed(settings.chartOptions.percentDecimal) + '%';
                decpercent = parsevalue;

            } else if (percentValue == 0) {
                decpercent = percentValue.toString() + '%';
            }
            const percent = (settings.chartOptions.chartshow == true && this.fieldsMeta.hasPercentageValues) ? decpercent : '';
            spanpercentvalue.innerHTML = percent.toString();
            if (percentValue == null) {
                this.emptyElement(element)
                UIIndicators.showErrorMessage(element, "Invalid percentage value data. Please add valid value");
                document.getElementById("vbi-error-message").removeAttribute('id');
            }
        }
    }

    private currentVersionYearCalc(data: Data, versionwrapper) {
        // Adding version year text
        const headertext1 = document.createElement('div');
        const headertext2 = document.createElement('div');
        headertext1.className = 'headertext';
        headertext2.className = 'headertext2';
        versionwrapper.appendChild(headertext1);
        versionwrapper.appendChild(headertext2);
        // Version year calculations
        if (data.categorical['groupDimension'][0].values.length > 1) {
            if (data.categorical['groupDimension'][0].values[0] < data.categorical['groupDimension'][0].values[1]) {
                headertext1.innerHTML = data.categorical['groupDimension'][0].values[0];
                headertext2.innerHTML = data.categorical['groupDimension'][0].values[1];
            } else {
                headertext1.innerHTML = data.categorical['groupDimension'][0].values[1];
                headertext2.innerHTML = data.categorical['groupDimension'][0].values[0];
            }
        } else {
            let lesslength = data.categorical['groupDimension'][0].values[0];
            headertext2.innerHTML = lesslength;

            if (isNaN(lesslength)) {
                headertext1.innerHTML = lesslength;
            } else {
                headertext1.innerHTML = (parseInt(lesslength) - 1).toString();
            }
        }
    }

    private PreviousVersionYearCalc(data: Data, versionwrapper) {
        // Previous Version year calculations
        const headertext3 = document.createElement('div');
        const headertext4 = document.createElement('div');
        headertext3.className = 'headertext';
        headertext4.className = 'headertext2';
        versionwrapper.appendChild(headertext3);
        versionwrapper.appendChild(headertext4);
        if (data.categorical['groupDimension'][0].values.length > 1) {
            if (isNaN(parseInt(data.categorical['groupDimension'][0].values[0])) || isNaN(parseInt(data.categorical['groupDimension'][0].values[1]))) {
                headertext3.innerHTML = data.categorical['groupDimension'][0].values[0];
                headertext4.innerHTML = data.categorical['groupDimension'][0].values[1];
            } else {
                const tab2offsetvalue = parseInt(data.categorical['groupDimension'][0].values[0]) - 1;
                const tab2offsetvalue2 = parseInt(data.categorical['groupDimension'][0].values[1]) - 1;

                if (data.categorical['groupDimension'][0].values[0] < data.categorical['groupDimension'][0].values[1]) {
                    headertext3.innerHTML = tab2offsetvalue.toString();
                    headertext4.innerHTML = tab2offsetvalue2.toString();
                } else {

                    headertext3.innerHTML = tab2offsetvalue2.toString();
                    headertext4.innerHTML = tab2offsetvalue.toString();
                }
            }
        } else {
            let lesslength = data.categorical['groupDimension'][0].values[0];
            headertext4.innerHTML = lesslength;

            if (isNaN(lesslength)) {
                headertext3.innerHTML = lesslength;
            } else {
                headertext4.innerHTML = (parseInt(lesslength) - 1).toString();
                headertext3.innerHTML = (parseInt(lesslength) - 2).toString();
            }
        }
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