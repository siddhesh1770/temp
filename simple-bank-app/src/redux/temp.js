// app.controller('deviceCtrl', function($scope, $http, $q, $window, $interval,$state,$location) {
    var app = angular.module('deviceApp', ['ui.bootstrap', 'ui.bootstrap.datetimepicker', 'ngAnimate', 'ui.router', 'infinite-scroll', 'toastr', 'ngTagsInput']);
    app.config(["$stateProvider", "$urlRouterProvider", "toastrConfig", function ($stateProvider, $urlRouterProvider, toastrConfig) {
    
        $urlRouterProvider.otherwise("/login");
    
        $stateProvider
            .state("login", {
                url: "/login",
                // abstract: true,
                templateUrl: "login.html",
                controller: "mainCtrl as vm",
            })
            .state("main", {
                url: "/main",
                templateUrl: "main.html",
                controller: "deviceCtrl as vm",
            });
        angular.extend(toastrConfig, {
            positionClass: 'toast-bottom-full-width',
            style: 'background-color-red'
        });
    }]);
    
    app.controller('deviceCtrl', function ($scope, $http, $q, $window, $interval, $sce, $state, $location, $timeout, toastr) {
    
        var BASEURL = "https://apis.intangles.com/";
        console.log('testing circle ci');
        // BASEURL = "http://blue-apis.intangles.com/";
    
        // BASEURL = "http://localhost:3000/";
    
        var MQTT_BASEURL = "mqtt://device.intangles.com:1883";
        // var MQTT_BASEURL = "mqtt://localhost:1883";
    
        $scope.isFromOpen = false;
        $scope.isDispatchDateOpen = false;
        var vm = this;
    
        var pr = getTheUser();
        if (pr == null) {
            localStorage.clear();
            // $state.go("login");
            $location.path("login");
            $state.go("login");
        } else
            pr.then(function (data) {
                var user = null;
                if (data && data.data && data.data.status && data.data.status.code == 200)
                    user = data.data.user;
                // console.log(data && data.data && data.data.status && data.data.status.code == 200,user);
                if (user == null) {
                    // $state.go("login");
                    localStorage.clear();
                    $location.path("login");
                    $state.go("login");
                } else {
                    $location.path("main");
                    $state.go("main");
                    renderTabs(user);
                    vm.is_intangles_user = user.is_intangles_user;
                    localStorage.setItem("User", JSON.stringify(user));
                    localStorage.setItem("UserTokenDate", new Date().getTime());
                    vm.user = user;
                    if (user.role == 'assembly')
                        $scope.view = 'assembly';
                }
            });
    
        $scope.isToOpen = false
        $scope.busy = false;
        $scope.data = {
            loading: false
        };
        vm.accounts = null;
        vm.accountsLoaded = false;
        vm.accountView = true;
        vm.pagesize = "50";
        vm.filter = {
            query: "*",
        };
        vm.childAccounts = {};
        vm.query = '';
        vm.account = {
            "name": "",
            "display_name": "",
            "isenabled": true
        };
        vm.selectedAccount = {};
        vm.stageFilter = "LIVE,POC";
        // vm.stageFilter = "";
    
        vm.resetView = function () {
            vm.vehicles = [];
            vm.currentAccount = {};
            vm.accountView = true;
            vm.vsearch.query = "";
        };
    
        //#region renderTabs
        vm.liveTabView = false;
        vm.historyTabView = false;
        vm.accountTabView = false;
        vm.deviceTestingTabView = false;
        vm.assemblyTabView = false;
        vm.deliveryChallanTabView = false;
        vm.oqcTabView = false;
    
        //#endregion    
    
        vm.token = localStorage.getItem("UserToken");
        vm.assemblyStatus = [{
            "value": "running",
            "display_name": "Running"
        }, {
            "value": "success",
            "display_name": "Success"
        }, {
            "value": "failed",
            "display_name": "Failed"
        }];
    
        vm.resetAssemblyDisabled = false;
    
        vm.cant_generate_challan = true;
        vm.imaxx_subsription_meta = {
            mfg_shift: "01",
            vendor_code: "DIL01",
            "1Y": {
                identification_code: "246", // as given by MTBD, identification code for VHMS
                years: 1,
                intangles: {
                    p1: "4GMHNSF400N1YA01",
                    p2: "4GMHNSF400N",
                    p3: "4GMHNSF400N1YS01",
    
                },
                mtbd: {
                    p1: "6219AAA00141N",
                    p2: "6219AAB00011N",
                    p3: "6219AAA00161N"
                }
            },
            /**
             * This is by default for ais devices for mahindra
             */
            "2Y": {
                identification_code: "246",
                years: 2,
                intangles: {
                    p1: "4GMHNSF400A2YA01",
                    p2: "4GMHNSF400A",
                    p3: "4GMHNSF400A2YS01",
    
                },
                mtbd: {
                    p1: "6219AAA00201N",
                    p2: "6219AAB00021N",
                    p3: "6219AAA00191N"
                }
            },
            "3Y": {
                identification_code: "246",
                years: 3,
                intangles: {
                    p1: "4GMHNSF400N3YA01",
                    p2: "4GMHNSF400N",
                    p3: "4GMHNSF400N3YS01",
    
                },
                mtbd: {
                    p1: "6219AAA00151N",
                    p2: "6219AAB00011N",
                    p3: "6219AAA00171N"
                }
            }
        };
    
        vm.emission_std = "BS4";       // if we can make a provision to get this dynamically and use mce_part_numbers consider this variable, BS3 & BS4 can be taken care of
        const mce_part_numbers = {
            "BS4": {
                "intangles": {
                    p1: "2GEPSF4M6O",
                    p2: "2GEPSF4M6O",
                    p3: "2GEPSF4M6O"
                },
                "mtbd": {
                    p1: "1805AAA07590N",
                    p2: "1805AAA07590N",
                    p3: "1805AAA07590N"
                }
            },
            "BS3": {
                "intangles": {
                    p1: "2GEPSF4M6VCE",
                    p2: "2GEPSF4M6VCE",
                    p3: "2GEPSF4M6VCE"
                },
                "mtbd": {
                    p1: "1805AAA07580N",
                    p2: "1805AAA07580N",
                    p3: "1805AAA07580N"
                }
            },
            "MEV": {
                "intangles": {
                    p1: "2GEPSF4M6OE",
                    p2: "2GEPSF4M6OE",
                    p3: "2GEPSF4M6OE"
                },
                "mtbd": {
                    p1: "1805AMJ00481N",
                    p2: "1805AMJ00481N",
                    p3: "1805AMJ00481N"
                }
            }
        };
    
        vm.int_subsription_meta = {
            emission_std: vm.emission_std,
            mfg_shift: "01",
            vendor_code: "DIL01",
            "1Y": {
                identification_code: "246", // as given by MTBD, identification code for VHMS
                years: 1,
                intangles: mce_part_numbers[vm.emission_std]["intangles"],
                mtbd: mce_part_numbers[vm.emission_std]["mtbd"]
            },
            "3Y": {
                identification_code: "246",
                years: 3,
                intangles: mce_part_numbers[vm.emission_std]["intangles"],
                mtbd: mce_part_numbers[vm.emission_std]["mtbd"]
            }
        };
    
        vm.carton = {
            max_devices: 10, // default
            initiated: false,
            sticker_printable: false,
            current: {
                seq_no: 1,
                quantity: 10
            },
            list: []
        };
    
        vm.sticker = {
            available: true,
            report: {}
        };
    
    
        function loadStickerData() {
    
            //        imaxx 
            //      else
    
            let metaInfo = {};
            if (vm.imaxxStickerEnabled) {
                vm.sticker.data = {
                    emission_std: "BS6",
                    ready_at: "JAN 2020", // curent month year
                    dev_version: "MAXCUBE 1.0.00",
                    serial_no: {
                        l1: `${vm.imaxx_subsription_meta.decided.identification_code}:${vm.imaxx_subsription_meta.decided.mtbd.p1}`,
                        l2: `${vm.imaxx_subsription_meta.vendor_code}:{{mfg_datestr}}:${vm.imaxx_subsription_meta.mfg_shift}`
                    },
                    supplier_ass_part_no: vm.imaxx_subsription_meta.decided.intangles.p1,
                    part: {
                        no: vm.imaxx_subsription_meta.decided.mtbd.p1,
                        desc_l1: "CONTROLLER VHMS",
                        desc_l2: `ASSEMBLY ${vm.imaxx_subsription_meta.decided.years} YEAR`,
                    },
                    child_part: {
                        controller_value_mtbd: `${vm.imaxx_subsription_meta.decided.mtbd.p2}`,
                        controller_value_intangles: `${vm.imaxx_subsription_meta.decided.intangles.p2}`,
                        subscription_title: `${vm.imaxx_subsription_meta.decided.years} YR. SUBSCRIPTION`,
                        subscription_value_mtbd: `${vm.imaxx_subsription_meta.decided.mtbd.p3}`,
                        subscription_value_intangles: `${vm.imaxx_subsription_meta.decided.intangles.p3}`
                    },
                    assembly: [{
                        name: "CL1",
                        user: "XX"
                    }, {
                        name: "CL2",
                        user: "XX"
                    }, {
                        name: "AS1",
                        user: "XX"
                    }, {
                        name: "AS2",
                        user: "XX"
                    }, {
                        name: "TST",
                        user: "XX"
                    }, {
                        name: "PKG",
                        user: "XX"
                    }]
                };
                if (vm.ais) {
                    vm.sticker.data.part.desc_l1 = "CONTROLLER VHMS TELEMATICS";
                    vm.sticker.data.part.desc_l2 = `ASSEMBLY AIS-140 ${vm.imaxx_subsription_meta.decided.years} YEAR`;
                }
            }
            else {
                vm.int_subsription_meta = {
                    emission_std: vm.emission_std,
                    mfg_shift: "01",
                    vendor_code: "DIL01",
                    "1Y": {
                        identification_code: "246", // as given by MTBD, identification code for VHMS
                        years: 1,
                        intangles: mce_part_numbers[vm.emission_std]["intangles"],
                        mtbd: mce_part_numbers[vm.emission_std]["mtbd"]
                    },
                    "3Y": {
                        identification_code: "246",
                        years: 3,
                        intangles: mce_part_numbers[vm.emission_std]["intangles"],
                        mtbd: mce_part_numbers[vm.emission_std]["mtbd"]
                    }
                };
                vm.int_subsription_meta.decided = vm.int_subsription_meta["1Y"];
                vm.sticker.data = {
                    ready_at: "JAN 2020", // curent month year
                    dev_version: "MAXCUBE 1.0.00",
                    emission_std: vm.emission_std,
                    serial_no: {
                        l1: `${vm.int_subsription_meta.decided.identification_code}:${vm.int_subsription_meta.decided.mtbd.p1}`,
                        l2: `${vm.int_subsription_meta.vendor_code}:{{mfg_datestr}}:${vm.int_subsription_meta.mfg_shift}`
                    },
                    supplier_ass_part_no: vm.int_subsription_meta.decided.intangles.p1,
                    part: {
                        no: vm.int_subsription_meta.decided.mtbd.p1,
                        desc_l1: "CONTROLLER VHMS",
                        desc_l2: `ASSEMBLY ${vm.int_subsription_meta.decided.years} YEAR`,
                    },
                    child_part: {
                        controller_value_mtbd: ``,
                        controller_value_intangles: ``,
                        subscription_title: ``,
                        subscription_value_mtbd: ``,
                        subscription_value_intangles: ``
                    },
                    assembly: [{
                        name: "CL1",
                        user: "XX"
                    }, {
                        name: "CL2",
                        user: "XX"
                    }, {
                        name: "AS1",
                        user: "XX"
                    }, {
                        name: "AS2",
                        user: "XX"
                    }, {
                        name: "TST",
                        user: "XX"
                    }, {
                        name: "PKG",
                        user: "XX"
                    }]
                };
            }
        }
    
        vm.idevice_cartons = [{
    
        }];
    
        function getAssemblyStages(cb) {
            var url = BASEURL + "idevice/assembly/stages?token=" + vm.token;
            get(url).then(function (res) {
                vm.assemblyStages = res.data.result;
                if (res.data.result && res.data.result.sequence) {
                    vm.assemblyStagesSequence = res.data.result.sequence;
                    if (cb) cb();
                }
    
    
            });
        }
    
        getAssemblyStages();
    
        function getIdeviceAssemblyReport(imeiInfo) {
            getAssemblyStages(function () {
                var url = `${BASEURL}idevice/${imeiInfo.imei}/assembly/report?token=${vm.token}`;
                get(url).then(function (res) {
                    let report = res.data.result;
                    vm.sticker = {};
                    vm.sticker.available = report.success ? true : false;
    
                    vm.sticker.reason = report.reason ? report.reason : undefined;
                    vm.sticker.report = report.data;
    
                    vm.imaxxStickerEnabled = false;
                    vm.intanglesStickerEnabled = false;
                    vm.greavesStickerEnabled = false;
                    vm.ais = false;
                    if (vm.selectedimeiAssembly && vm.selectedimeiAssembly.device_model === "MAXCUBE") {
                        vm.imaxxStickerEnabled = true;
                        vm.sticker.sticker_type = 'IMAXX';
                        vm.ais = vm.selectedimeiAssembly.tags.indexOf("ais") > -1;
                    }
                    else if (vm.selectedimeiAssembly && vm.selectedimeiAssembly.device_model === "GREAVES") {
                        vm.greavesStickerEnabled = true;
                        var currentMonent = new moment();
                        vm.greavesManufactureDate = (currentMonent.month() + 1) + "/2022GEN"; // hard coded for now
                        greavesStickerFn(report);
                        return;
                    }
                    else {
                        vm.intanglesStickerEnabled = true;
                        vm.sticker.sticker_type = 'MCE';
                    }
    
                    let sticker_enabled = true;
                    let subs_years = undefined;
                    if (report.data && report.data.hasOwnProperty("subscription_years")) {
                        subs_years = parseInt(report.data.subscription_years);
                        vm.sticker.report.isSubscriptionPresent = true;
                    } else {
                        if ((!vm.sticker.report || !vm.sticker.report.isSubscriptionPresent) && vm.imaxxStickerEnabled) {
                            vm.sticker.report = {};
                            vm.sticker.report.isSubscriptionPresent = false;
                        } else {
                            vm.sticker.report.isSubscriptionPresent = false;
                        }
                    }
                    let currentInfo;
                    if (vm.imaxxStickerEnabled)
                        currentInfo = vm.imaxx_subsription_meta[subs_years + "Y"];
                    else
                        currentInfo = vm.int_subsription_meta["1Y"];
                    if (!currentInfo) {
                        sticker_enabled = false;
                        vm.sticker = {};
                    } else {
                        sticker_enabled = true;
                        if (vm.imaxxStickerEnabled)
                            vm.imaxx_subsription_meta.decided = currentInfo;
                        else
                            vm.int_subsription_meta.decided = currentInfo;
                        // for non max cube pick '1Y'
                        vm.subYear = subs_years;
                    }
    
                    if (vm.imaxxStickerEnabled || vm.intanglesStickerEnabled) {
                        report.data.assembly['TST'] ? null : report.data.assembly['TST'] = {};
                        report.data.assembly['STK'] ? null : report.data.assembly['STK'] = {};
    
                        loadStickerData();
                        if (report.data && report.data.assembly && report.data.assembly['TST'] && report.data.assembly.TST.status === "success" &&
                            report.data.assembly['STK'].status !== "success") {
                            vm.sticker.required = true;
                        } else {
                            vm.sticker.required = false;
                        }
    
                        vm.sticker.message = vm.sticker.available ? `Sticker is READY` : `Sticker not ready yet, reason: ${vm.sticker.reason}`;
    
                        if (vm.sticker.available && vm.sticker.required) {
                            setTimeout(async function () {
                                vm.sticker.message = "Sticker is getting ready...";
                                await generateSticker(vm.sticker,
                                    "sticker_code_01", "sticker_code_02",
                                    "sticker_code_03", "sticker_code_04",
                                    "sticker_code_05", "sticker_code_06",
                                    "sticker_code_07", "sticker_code_08",
                                    "sticker_code_09", "sticker_code_10",
                                    "sticker_code_11", {
                                    stages: vm.assemblyStagesSequence
                                });
                                await generateStickerImg();
                                vm.sticker.message = "Sticker is ready...";
                                toastr.info("sticker is getting ready");
                            }, 1000);
                        }
                    }
                });
            });
        }
    
        function greavesStickerFn(report) {
            vm.sticker = {};
            if (!report.data)
                report.data = { "assembly": { "CL1": {}, "CL2": {}, "AS1": {}, "AS2": {}, "TST": {}, "OQC": {}, "STK": {} } };
    
            report.data.assembly['TST'] ? null : report.data.assembly['TST'] = {};
            report.data.assembly['STK'] ? null : report.data.assembly['STK'] = {};
    
            if (report.data && report.data.assembly && report.data.assembly['TST'] && report.data.assembly.TST.status === "success" &&
                report.data.assembly['STK'].status !== "success") {
                vm.sticker.required = true;
                vm.sticker.available = true;
            } else {
                vm.sticker.required = false;
                // vm.sticker.available = true;        
            }
    
            vm.sticker.message = vm.sticker.available ? `Sticker is READY` : `Sticker not ready yet, reason: ${vm.sticker.reason}`;
    
            if (vm.sticker.available && vm.sticker.required) {
                setTimeout(function () {
                    JsBarcode("#greaves_imei", vm.selectedimeiAssembly.imei, {
                        format: "CODE128",
                        displayValue: true,
                        height: 25,
                        width: 1,
                        font: 'arial',
                        fontSize: 12,
                        textMargin: 1,
                        marginLeft: 1,
                        marginRight: 1,
                        marginTop: 1,
                        marginBottom: 1
                    });
                    vm.sticker.message = "Sticker is getting ready...";
                    toastr.info(vm.sticker.message);
                }, 2000);
            }
        }
    
    
        vm.setAssemblyStage = function (selectedAssembly) {
            var url = BASEURL + "user/assembly/set/stage?token=" + vm.token;
            var obj = {};
            obj[vm.selectedAssembly] = vm.user.id;
            console.log(obj);
            post(url, obj).then(function (res) {
                if (res.data.status.code == 200)
                    console.log(res.data);
                else {
                    alert(res.data.status.message);
                }
            });
        };
    
        function generateStickerImg() {
            setTimeout(function () {
                html2canvas($('#sticker').get(0)).then(function (canvas) {
                    let ctx = canvas.getContext("2d");
                    ctx.webkitImageSmoothingEnabled = false;
                    ctx.mozImageSmoothingEnabled = false;
                    ctx.imageSmoothingEnabled = false;
                    vm.myImage = canvas.toDataURL("image/png");
                    document.getElementById('resultant-image').src = vm.myImage;
                });
                toastr.info(vm.sticker.message);
            }, 2000);
        }
        vm.generateImeiStickerImg = function () {
            setTimeout(function () {
                html2canvas($('#print-imei-sticker').get(0)).then(function (canvas) {
                    var imeiImage = canvas.toDataURL("image/png");
                    document.getElementById('img-imei-sticker').src = imeiImage;
                    vm.imeiImage = imeiImage;
                    // downloadURI("data:" + imeiImage, "imei.png");
                });
            }, 1000);
        }
    
        vm.generateCartonStickerImg = function () {
            setTimeout(function () {
                html2canvas($('#print-carton-sticker').get(0)).then(function (canvas) {
                    var carton_sticker = canvas.toDataURL("image/png");
                    document.getElementById('carton-sticker-img').src = carton_sticker;
                    vm.carton.stickerURI = carton_sticker;
                });
            }, 1000);
        }
    
        vm.printSticker = function () {
            downloadURI("data:" + vm.myImage, `${vm.sticker.report.imei}_imaxx_sticker.png`);
        };
    
        vm.printGreavesSticker = function () {
            html2canvas($('#greaves_sticker2').get(0), { scale: 2 }).then(function (canvas) {
                var myImage = canvas.toDataURL("image/png");
                downloadURI("data:" + myImage, `greaves-${vm.selectedimeiAssembly.imei}.png`);
            });
        };
    
        vm.printImeiSticker = function () {
            downloadURI("data:" + vm.imeiImage, "imei.png");
        };
    
        vm.printCartonSticker = function () {
            downloadURI("data:" + vm.carton.stickerURI, `${vm.carton.current.seq_no}_carton_sticker.png`);
        };
    
        function downloadURI(uri, name) {
            var link = document.createElement("a");
            link.download = name;
            link.href = uri;
            link.click();
        }
    
        vm.updateAssemblyStatus = function (stage, status, value) {
            var obj = {};
            if (stage == 'STK') {
                if (!vm.subYear && !vm.currentAssemblyStage["STK"].force_status_update) {
                    toastr.error("Please enter subscription year");
                    return;
                }
            }
            // if(stage == 'OQC' || stage == 'STK'){
            //     if(value)
            //     obj.images = value;
            // }
            var imei = vm.selectedimeiAssembly.imei;
            var stage = stage;
            var status = status;
            var url = BASEURL + "idevice/" + imei + "/assembly/" + stage + "/" + status + "/?token=" + vm.token;
            if (status == 'failed') {
                if (!value.reason) {
                    toastr.error("please provide reason for failure");
                    return;
                }
                var obj = {
                    "reason": value.reason
                };
            }
    
            post(url, obj).then(function (res) {
                if (res.data.status.code == 200) {
                    console.log(res.data);
                    toastr.info('Assembly Stage Updated');
                    $timeout(function () {
                        resetAssemblyStatus();
                    }, 2000);
                } else {
                    var error_message = "Some error occured";
                    if (res.data && res.data.status && res.data.status.message)
                        error_message = res.data.status.message;
                    toastr.error(error_message);
                }
            });
        };
    
        function resetAssemblyStatus() {
            vm.selectedimeiAssembly = undefined;
            vm.selectedAssemblyStatus = undefined;
            vm.selectedAssemblyStatus = undefined;
            vm.assemblyStatusReason = undefined;
            vm.uploadFiles = [];
            vm.uploadFilesInfo = [];
            vm.imagePreview = [];
        }
    
        function resetOqcForm() {
            $scope.oqc_selectedimei = null;
            $scope.dimensions_height = null;
            $scope.dimensions_length = null;
            $scope.dimensions_width = null;
            $scope.hole_dia = null;
            $scope.hole_radius = null;
            $scope.led = null;
            $scope.drop_test = null;
            $scope.ip67 = null;
        }
    
        vm.updateOqc = function (idevice) {
            if (idevice.oqc && idevice.oqc.status)
                var status = idevice.oqc.status;
            else
                var status = "success";
            var reason = "Incorrect dimensions";
            if (!($scope.dimensions_length >= 157.2 && $scope.dimensions_length <= 158.2)) {
                status = "failed";
            }
            if (!($scope.dimensions_width >= 132 && $scope.dimensions_width <= 133)) {
                status = "failed";
            }
            if (!($scope.dimensions_height >= 44.5 && $scope.dimensions_height <= 45.5)) {
                status = "failed";
            }
            if (!($scope.hole_radius >= 3.4 && $scope.hole_radius <= 3.6)) {
                status = "failed";
            }
            if (!($scope.hole_dia >= 6.9 && $scope.hole_dia <= 7.1)) {
                status = "failed";
            }
            if (!$scope.led) {
                status = "failed";
                reason = "Led : Not okay"
            }
            if (!$scope.drop_test) {
                status = "failed";
                reason = "Drop test : Not okay"
            }
            if (!$scope.ip67) {
                status = "failed";
                reason = "IP 67 : Not okay"
            }
    
            if ($scope.enable_mechanical) {
                var obj = {
                    "dimensions": {
                        "length": $scope.dimensions_length,
                        "width": $scope.dimensions_width,
                        "height": $scope.dimensions_height
                    },
                    "hole": {
                        "radius": $scope.hole_radius,
                        "diameter": $scope.hole_dia,
                    },
                    "led": $scope.led,
                    "drop_test": $scope.drop_test,
                    "ip67": $scope.ip67
                };
            }
            if ($scope.enable_stickers) {
                var obj = {
                    "stickers": true,
                    "void_sticker": $scope.void_sticker,
                    "oqc_imei_sticker": $scope.oqc_imei_sticker,
                    "subscription_sticker": $scope.subscription_sticker,
                }
            }
    
            var imei = idevice.imei;
            var url = BASEURL + "idevice/" + imei + "/oqc/" + status + "/?token=" + vm.token;
            if (status == 'failed') {
                obj.reason = reason
            }
            console.log(obj);
    
            post(url, obj).then(function (res) {
                if (res.data.status.code == 200) {
                    toastr.info('OQC Info Updated');
                    $timeout(function () {
                        resetOqcForm();
                    }, 2000);
                } else {
                    var error_message = "Some error occured";
                    if (res.data && res.data.status && res.data.status.message)
                        error_message = res.data.status.message;
                    toastr.error(error_message);
                }
            });
        };
    
        function updateAccountList(pnum, filter, type) {
    
            if (!pnum)
                vm.pnum = 1;
            else
                vm.pnum = pnum;
            if (!filter)
                filter = '';
            else if (filter == 'ALL')
                filter = '';
            if (type == '*')
                type = null;
            vm.accountsLoaded = false;
            var url = BASEURL + "account/listV2?sort=display_name%20asc&token=" + vm.token;
            if (vm.pagesize)
                url += "&psize=" + vm.pagesize;
            if (pnum)
                url += "&pnum=" + pnum;
            if (vm.stageFilter)
                url += "&stage=" + vm.stageFilter;
            if (vm.accountQuery)
                url += "&query=" + vm.accountQuery;
            //   url += "&query=swap";
    
            get(url).then(function (data) {
                console.log('data', data.data);
                vm.accounts = data.data;
                vm.accountsLoaded = true;
                console.log('vm.accounts', vm.accounts.accounts);
    
            });
        }
    
        vm.updateAccountList = updateAccountList;
        if (localStorage.getItem("User"))
            updateAccountList(1, vm.stageFilter);
    
        vm.setCurrentAccount = function (a) {
            console.log(a)
            vm.currentAccount = a;
        };
        vm.vsearch = {};
    
        $scope.searchVehicle = function (typedValue) {
            if (!typedValue)
                return;
            if (typedValue) {
                vm.vsearch.query = typedValue.replace(/\s/g, "");
            }
            var url = BASEURL + 'vehicle/getlist?status=*&lastloc=false&sort=tag%20asc&token=' + vm.token;
            if (vm.pnum)
                url += "&pnum=" + vm.pnum;
            if (vm.pagesize)
                url += "&psize=" + vm.pagesize;
            if (vm.currentAccount && vm.currentAccount.id)
                url += "&acc_id=" + vm.currentAccount.id;
            if (vm.vsearch && vm.vsearch.query)
                url += "&query=" + vm.vsearch.query;
            vm.vehiclesLoaded = false;
            get(url).then(function (data) {
                console.log(vm.vehicles);
                vm.vehiclesLoaded = true;
                return vm.vehicles = data.data;
    
            });
        };
    
        vm.getVehicles = function (pnum, psize) {
            if (pnum)
                vm.pnum = pnum;
            else
                vm.pnum = 1;
            if (psize)
                vm.pagesize = psize;
            else
                vm.psize = 20;
            var url = BASEURL + 'vehicle/getlist?status=*&lastloc=false&sort=tag%20asc&token=' + vm.token;
            if (vm.pnum)
                url += "&pnum=" + vm.pnum;
            if (vm.pagesize)
                url += "&psize=" + vm.pagesize;
            if (vm.currentAccount && vm.currentAccount.id)
                url += "&acc_id=" + vm.currentAccount.id;
            if (vm.vsearch && vm.vsearch.query)
                url += "&query=" + vm.vsearch.query;
            vm.vehiclesLoaded = false;
            get(url).then(function (data) {
                vm.vehicles = data.data;
                console.log(vm.vehicles);
                vm.vehiclesLoaded = true;
            });
        };
    
        vm.addUpdateVehicle = function (addVehicleForm) {
            if (addVehicleForm.$valid) {
                vm.loaderForVehicle = true;
    
                var url = BASEURL + "vehicle/createV2?";
                url = url + "&token=" + vm.token;
                var accountId = vm.currentAccount.id;
                if (accountId) {
                    url = url + "&acc_id=" + accountId;
                }
                post(url, vm.vehicle).then(function (data) {
                    if (data.data.status.code == 200) {
                        toastr.info('Vehicle Added Successfully');
                        $timeout(function () {
                            $("#myModal").modal("hide");
                            vm.getVehicles(1);
                        }, 500);
                    } else {
                        toastr.error('Failed to Add Vehicle');
                    }
                    vm.loaderForVehicle = false;
                });
            }
        };
    
        vm.cancel = function () {
            vm.removedTags = [];
            vm.input = {
                'name': '',
                'phone': ''
            };
            $("#myModal").modal("hide");
        };
    
        vm.newDeviceCarton = async function () {
            vm.carton.initiated = false;
            vm.carton.sticker_printable = false;
            let url = `${BASEURL}inventory/device/packaging/carton/new?token=${vm.token}`
            let body = {
                quantity: vm.carton.max_devices //temporary
            }
    
            let res = await post(url, body);
    
            if (res.data.status.code === 200) {
                /**
                 * on success, we get more information about the registered carton box
                 * which will be used to generate box-identifier qrcode
                 */
                let box_info = res.data.result;
                vm.carton.current = box_info;
    
                vm.carton.initiated = true;
                toastr.info("carton sticker getting ready");
                setTimeout(function () {
                    generateCartonBarcode(box_info, vm.imeiInfo.device_version);
                    vm.generateCartonStickerImg();
                    vm.carton.sticker_printable = true;
                    toastr.info("Successful, Print the QRCode and affix to the new carton");
                }, 1000);
    
                vm.listDeviceCartons();
    
            } else {
                vm.carton.initiated = false
                toastr.error("Some Error occured while initiating new carton-box");
            }
        };
    
        vm.addDeviceToCarton = async function (carton_id, imei) {
            /**
             * Device imei and box id from barcode scan, will be used to add Device to Carton
             * which will also mark device's PKG stage completion
             * the respected box packaging information will be added in device info as well
             */
    
            let url = `${BASEURL}inventory/device/packaging/carton/${carton_id}/update?token=${vm.token}`
            let body = {
                add_content: [imei] //temporary
            }
    
            let res = await post(url, body);
    
            if (res.data.status.code === 200) {
                let updated_carton = res.data.result;
    
                if (updated_carton.status !== "filling") {
                    if (updated_carton.content.indexOf(imei) !== -1) {
                        toastr.info("IMEI added and the carton is full now, you need to use different carton next time");
                        resetAssemblyStatus();
                    } else {
                        toastr.error(`IMEI could not be added, the carton is ${updated_carton.status}`);
                    }
                    vm.carton.current = {};
                } else {
                    toastr.info("Successfully added device to  the carton");
                    vm.carton.current = updated_carton;
                    resetAssemblyStatus();
                }
            } else {
                toastr.error("Some Error occured while device to carton");
            }
        };
    
        vm.deviceCartonPacked = async function () {
            /**
             * Once adding devices to carton are completed, the carton will be packed and 
             * a qrcode with collective information of all devices present in it and the box-id will be 
             * generated, which will first mark the carton to state packed
             * During the dispatch stage, it'll be mandatory to scan the same qrcode to access the box
             */
    
            let box_id = "722534161906139136"; // temporary
            let url = `${BASEURL}inventory/device/packaging/carton/${box_id}/update?token=${vm.token}`
            let body = {
                status: "packed" //temporary
            };
    
            let res = await post(url, body);
    
            if (res.data.status.code === 200) {
                /**
                 * on success, we get more information about the registered carton box
                 * which will be used to generate box-identifier qrcode
                 */
                let updated_box = res.data.result;
                // box barcode generation here
            }
        };
    
        vm.getdeviceCartonById = async function () {
            let box_id = "722534161906139136"; // temporary
            let url = `${BASEURL}inventory/device/packaging/carton/${box_id}/get?token=${vm.token}`
    
    
            let res = await get(url);
    
            if (res.data.status.code === 200) {
                /**
                 * on success, we get more information about the registered carton box
                 * which will be used to generate box-identifier qrcode
                 */
    
                if (res.data.result) {
                    return res.data.result;
                } else {
                    toastr.info("No registered box found with given id");
                }
            } else {
                toastr.error("Some Error occured while getting carton-box info");
            }
        };
    
        vm.listDeviceCartons = async function () {
            let url = `${BASEURL}inventory/device/packaging/carton/list?token=${vm.token}&material=idevice&psize=5`;
    
            /**
             * Supported options: 
             *  pnum, psize, seq_no, material, from(epoch), to(epoch)
             */
            // query params will be appended here, once the view is ready
            let res = await get(url);
    
            if (res.data.status.code === 200) {
                /**
                 * on success, we get more information about the registered carton box
                 * which will be used to generate box-identifier qrcode
                 */
                let list = res.data.result;
                for (let i = 0; i < list.length; i++) {
                    list[i].content ? null : list[i].content = [];
                }
                vm.carton.list = list;
                // box barcode generation here
    
                if (list.length) {
                    toastr.info("No carton boxes found with given criterion");
                }
            } else {
                toastr.error("Some Error occured while getting fetching carton boxes");
            }
        };
    
        $scope.openCalendar = function (e, cal, c) {
            e.preventDefault();
            e.stopPropagation();
            console.log(cal, c)
            if (c == 'from')
                $scope.isFromOpen = true;
            else if (c == 'to')
                $scope.isToOpen = true;
            else if (c == 'dispatch_date')
                $scope.isDispatchDateOpen = true;
            else {
                $scope.isDispatchDateOpen = false;
            }
        };
    
        $scope.imeiArray = [];
        $scope.calibrate = false;
        $scope.testmode = false;
        var promise;
        vm.hide_history_tab = false;
        //  $scope.mode = undefined;
        var userInfo = localStorage.getItem('User');
        var MQTT_BASEURL_TESTING = "mqtt://device.intangles.com:1883";
        if (userInfo) {
            var u = JSON.parse(userInfo);
            var clientID = "ui-reader-" + parseInt(Math.random() * 100, 10) + '-' + u.username;
            var clientForTestingID = "ui-reader-" + parseInt(Math.random() * 100, 10) + '-' + u.username;
            if (u && u.role == 'deployment') {
                MQTT_BASEURL = 'wss://events-server.intangles.com';
                vm.hide_history_tab = true;
            }
        } else {
            var clientForTestingID = "ui-reader" + parseInt(Math.random() * 100, 10);
            var clientID = "ui-reader" + parseInt(Math.random() * 100, 10);
        }
        var clientForTesting = mqtt.connect(MQTT_BASEURL_TESTING, {
            clientId: clientForTestingID
        });
        var client = mqtt.connect(MQTT_BASEURL, {
            clientId: clientID
        });
        $scope.reload = function () {
            location.reload();
        };
    
        $scope.view = 'live';
    
        vm.addDeliveryChalan = function (imei) {
            if (imei) {
                addIMEIWithInfoForDeliveryChallan(imei)
            }
        };
    
        vm.addBillToDeliveryChallan = function (bill_to) {
            vm.challan.bill_to = bill_to;
        };
    
        vm.onBillToChange = function (t) {
            vm.challan.bill_to = vm.challan.bill_to_str.split(";").join("\n");
        };
    
        vm.onShipToChange = function (t) {
            vm.challan.ship_to = vm.challan.ship_to_str.split(";").join("\n");
        };
    
        vm.onMaxDevPerBoxChange = function () {
            vm.challan.total_boxes = Math.ceil(Object.values(vm.challan.map).length / parseInt(vm.challan.max_devices_per_box));
            if (vm.challan.ready) {
                // regenerate challan
                vm.generateChallan();
            }
        }
    
        vm.removeIMEIFromChallan = function (imei) {
            if (imei) {
                delete vm.challan.map[imei];
            }
            if (Object.keys(vm.challan.map).length === 0) {
                vm.challan.cant_generate = true;
                vm.resetChallan();
            } else {
                if (vm.challan.ready) {
                    // trigger regeneration of challan if already done
                    vm.generateChallan();
                }
            }
    
        };
    
    
        let today = new Date();
        let year_start_epoch = new Date(new Date().getFullYear(), 0, 1).getTime();
        let julian_date = Math.floor((new Date().getTime() - year_start_epoch) / (86400000)); // divided by 24hrs
        let jdate = julian_date < 10 ? `00${julian_date}` : julian_date < 100 ? `0${julian_date}` : julian_date
        vm.challan = {
            date: today.toLocaleDateString(),
            cant_generate: true,
            map: {},
            imeis: [],
            list_imeis: [],
            prepared_by: "",
            approved_by: "",
            dispatched_by: "",
            max_devices_per_box: 0,
            total_boxes: 0,
            delivery_note_no: `DN${String(today.getFullYear()).substr(2, 2)}${jdate}01`,
            boxes: {},
            allImeis: []
        };
        let resetChallan = function () {
    
            vm.challan = {
                date: today.toLocaleDateString(),
                cant_generate: true,
                map: {},
                imeis: [],
                list_imeis: [],
                prepared_by: "",
                approved_by: "",
                dispatched_by: "",
                total_boxes: 0,
                max_devices_per_box: 0,
                delivery_note_no: `DN${String(today.getFullYear()).substr(2, 2)}${jdate}01`,
                boxes: {},
                allImeis: []
            };
            vm.box_no = 0;
        };
    
        vm.resetChallan = resetChallan;
        vm.box_no = 0;
    
        vm.addBox = function () {
            vm.box_no++;
            var im = _.clone(vm.challan.list_imeis);
            vm.challan.allImeis.push(_.map(im, 'text'));
            vm.challan.boxes["Box-" + vm.box_no] = [];
            for (let i = 0; i < vm.challan.list_imeis.length; i++) {
                const element = vm.challan.list_imeis[i];
                vm.challan.boxes["Box-" + vm.box_no].push({
                    "imei": element.text,
                    "box-no": vm.box_no
                });
            }
            vm.challan.list_imeis = [];
            console.log(vm.challan);
        };
    
        vm.printChallan = function () {
            for (let i = 0; i < vm.challan.pages.length; i++) {
                var divId = "pr-" + i;
                html2canvas($('#' + divId).get(0)).then(function (canvas) {
                    var myImage = canvas.toDataURL("image/png");
                    downloadURI("data:" + myImage, "yourImage.png");
                });
            }
        }
    
        vm.generateChallan = function () {
    
            if (vm.box_no == 0) {
                if (vm.challan.max_devices_per_box == 0)
                    vm.challan.max_devices_per_box = 5;
                vm.addBox();
            }
    
            //vm.challan.imeis =_.flatten(vm.challan.allImeis);//
            vm.challan.imeis = Object.values(vm.challan.map);
            vm.challan.total_boxes = Math.ceil(vm.challan.imeis.length / parseInt(vm.challan.max_devices_per_box));
            let box_imeis = vm.challan.imeis;
            let boxes = [];
            let b = 1;
            console.log('box_imeis', box_imeis);
            while (box_imeis.length) {
                let box = box_imeis.splice(0, vm.challan.max_devices_per_box);
                boxes.push(box);
            }
            vm.challan.imeis = boxes.reduce((p, c, i, []) => {
                return c = c.concat(p);
            });
    
            let temp = _.clone(vm.challan.imeis);
            temp.map(function (a, i) {
                a.sr = i + 1;
            });
            // _.times(15, function (n) {
            //     temp.push(vm.challan.imeis[0])
            // });
    
            // all imeis imei contain box number
    
            vm.challan.pages = [];
    
            vm.challan.pages.push(temp.splice(0, 4));
            while (temp.length) {
                vm.challan.pages.push(temp.splice(0, 9));
            }
    
            vm.challan.ready = true;
            vm.challan.summary = _.groupBy(vm.challan.imeis, "sub_years");
            vm.challan.product_details = [];
            for (let y in vm.challan.summary) {
                let t = {
                    years: y,
                    qty: vm.challan.summary[y].length
                };
                vm.challan.product_details.push(t);
            }
        }
    
        async function getIMEIInfoByIMEI(imei) {
            var url = BASEURL + "idevice/" + imei + "/allinfoV2?token=" + vm.token;
            let res = await get(url);
            if (res && res.status === 200 && res.data && res.data.status && parseInt(res.data.status.code) === 200) {
                return res.data.result;
            }
            return null;
        }
    
        function genBarcodeDataUrlForChallan(text) {
            let datamatrix_options = {
                bcid: "code128",
                scale: 1,
                text: text,
                width: 30,
                height: 5
            };
            temp_can = bwipjs.toCanvas("temp_canvas", datamatrix_options);
            return temp_can.toDataURL();
        }
    
        async function getStructureObjForIMEIInfo(info) {
    
            let decided_meta = vm.imaxx_subsription_meta[`${info.subscription_years}Y`];
            if (!decided_meta) return null;
            let regex = new RegExp(/^\d+/g);
            let iccid;
            if (info.sims && info.sims.embedded) {
                iccid = `${info.sims.embedded.number.match(regex)}`;
            } else if (info.sims && info.sims.normal) {
                iccid = `${info.sims.normal.number.match(regex)}`;
            }
    
            if (!iccid) return null;
            let obj = {
                sub_years: info.subscription_years,
                imei: info.imei,
                iccid: iccid,
                imei_barcode: genBarcodeDataUrlForChallan(info.imei),
                iccid_barcode: genBarcodeDataUrlForChallan(iccid),
                cust_sr_no: decided_meta.mtbd.p1,
                cust_subs_no: decided_meta.mtbd.p3,
                int_sr_no: decided_meta.intangles.p1,
                int_subs_no: decided_meta.intangles.p3
            }
            return obj;
        }
    
        async function addIMEIWithInfoForDeliveryChallan(imei) {
            let info = await getIMEIInfoByIMEI(imei);
            if (info && info.tracker && info.tracker.hasOwnProperty("subscription_years")) {
                let obj = await getStructureObjForIMEIInfo(info.tracker);
                if (obj) {
                    if (vm.box_no == 0)
                        obj.box_no = 1;
                    else
                        obj.box_no = vm.box_no + 1;
                    vm.challan.cant_generate = false;
                    vm.challan.map[info.tracker.imei] = obj;
                }
                if (vm.challan.ready) {
                    // trigger regeneration of challan if already done
                    vm.generateChallan();
                }
            }
        }
    
        $scope.subscribe = function () {
            $scope.messageArray = [];
            $scope.calibrateArray = [];
            $scope.svArray = [];
            $scope.finalSvArray = [];
            $scope.messageLoading = true;
            if (vm.hide_history_tab)
                client.subscribe($scope.imei + '/data');
            else
                client.subscribe('uimsg-' + $scope.imei);
            $scope.subscribeMessage = 'Subscribed to IMEI  ' + $scope.imei;
            $scope.monitor = true;
            $scope.logs = true;
            $scope.calibrate = false;
            $scope.obd_handshake = undefined;
            $scope.obd_gps = undefined;
            $scope.obd_message = undefined;
            $scope.mode = undefined;
            $scope.vts_handshake = undefined;
            $scope.vts_gps = undefined;
            $scope.vts_message = undefined;
            $scope.vts_setting = undefined;
            $scope.zero_value = undefined;
            $scope.one_value = undefined;
            $scope.testmode = false;
        };
    
        if (vm.hide_history_tab)
            client.on('message', onMessageMqtt);
        else
            client.on('message', onMessage);
    
        function onMessageMqtt(topic, message) {
            var stringMessage = message.toString();
            if (stringMessage) {
                var mes = JSON.parse(stringMessage);
                var parsedstring = mes.message;
                if (parsedstring.fuel_data && parsedstring.loc_data) {
                    var info = fuelDateLocInfo(parsedstring);
                    $scope.messageArray.push({
                        "time": parsedstring.time,
                        "imei": parsedstring.imei,
                        "message": info
                    });
                }
                if (parsedstring.obd_data) {
                    var o1 = obdInfo(parsedstring);
                    $scope.messageArray.push({
                        "time": parsedstring.time,
                        "imei": parsedstring.imei,
                        "message": o1
                    });
                }
                if (parsedstring.loc_data) {
                    var i1 = locInfo(parsedstring);
                    $scope.messageArray.push({
                        "time": parsedstring.time,
                        "imei": parsedstring.imei,
                        "message": i1[0],
                        "isHistory": i1[1]
                    });
                }
                console.log(parsedstring);
                $scope.messageLoading = false;
                $scope.$apply();
            }
        }
    
        function fuelDateLocInfo(a) {
            var f = a.fuel_data[0];
            var l = a.loc_data;
            var fuel_data = {};
            if (f && f.rh) {
                fuel_data = {
                    real_time_height: f.rh,
                    signal_strength: f.ss,
                    software_code: f.sc,
                    hardware_code: f.hc,
                };
            } else {
                console.log(a);
            }
    
            var location_data = {
                msg_time: getTimeForReport(l.timestamp),
                location: {
                    latitude: l.loc.lat,
                    longitude: l.loc.lng,
                    fix: l.loc.fix
                },
                speed: l.sp,
                heading: l.hd,
                no_of_satellite: l.ns
            };
            if (l.hist) {
                location_data.history = l.hist;
            }
            var vehicle;
            if (a.vehicle && a.vehicle.tag)
                vehicle = a.vehicle.tag;
            var fuelLoc = {
                fuel_data: fuel_data,
                location_data: location_data
            };
            var returnText = " (" + vehicle + ") " + " (fuel + location) " + JSON.stringify(fuelLoc);
            return returnText;
        }
    
        function obdInfo(a) {
            var o = a.obd_data;
            var obd_data = {
                vehicle_voltage: o.volt,
                msg_time: getTimeForReport(o.timestamp),
                collecting_pids: o.collecting_pids,
                collecting_dtcs: o.collecting_dtcs
            };
            if (o.hasOwnProperty("alfl_voltage")) obd_data.alfl_voltage = o.alfl_voltage;
            var vehicle;
            if (a.vehicle && a.vehicle.tag)
                vehicle = a.vehicle.tag;
            var returnText = " : (" + vehicle + ")  " + a.imei + " (obd) " + JSON.stringify(obd_data);
            return returnText;
        }
    
        function locInfo(a) {
            var l = a.loc_data;
            var location_data = {
                msg_time: getTimeForReport(l.timestamp),
                location: {
                    latitude: l.loc.lat,
                    longitude: l.loc.lng,
                    fix: l.loc.fix
                },
                speed: l.sp,
                heading: l.hd,
                no_of_satellite: l.ns,
                signal_strength: l.signal_strength,
                sim: l.sim
            };
            if (l.hasOwnProperty("dc")) {
                location_data.dc = l.dc;
            }
            if (l.hasOwnProperty("dc3")) {
                location_data.dc3 = l.dc3;
            }
            if (l.hist) {
                location_data.history = l.hist;
            }
            var vehicle;
            if (a.vehicle && a.vehicle.tag)
                vehicle = a.vehicle.tag;
            var returnText = " : (" + vehicle + ") " + a.imei + " (location) " + JSON.stringify(location_data);
            return [returnText, l.hist];
        }
    
        function getTimeForReport(timestamp) {
            var current = new moment();
            var t = moment(parseInt(timestamp));
            // var format = "ddd, MMM Do, h:mm a";
            var format = "MMM Do, h:mm:ss a";
            if (current.year() !== t.year()) {
                format = "ddd, MMM Do YYYY, h:mm:ss a";
            }
            return t.format(format);
        }
    
        function onMessage(topic, message) {
            var stringMessage = message.toString();
            if (stringMessage) {
                var parsedstring = JSON.parse(stringMessage);
                if (parsedstring.a == 'offline' || parsedstring.a == 'disconnected') {
                    $scope.isOnline = 'Offline';
                } else if (parsedstring.a == 'online' || parsedstring.a == 'connected') {
                    $scope.isOnline = 'Online';
                }
    
                if ($scope.testmode && $scope.se) {
                    console.log(parsedstring);
                    if (parsedstring.a == "message" || parsedstring.a == "published")
                        testMode(parsedstring);
                }
    
                $scope.messageArray.push({
                    event: parsedstring.tp,
                    message: parsedstring.msg,
                    time: parsedstring.t,
                    imei: parsedstring.c
                });
    
                if ($scope.calibrate) {
                    jsonMsg = parsedstring.msg;
                    calibrate(jsonMsg);
                }
    
                $scope.messageLoading = false;
                $scope.$apply();
            }
    
        };
    
        function calibrate(jsonMsg) {
            jsonMsg = jsonMsg.replaceAll("\"B\":000,", "\"B\":0,");
            jsonMsg = jsonMsg.replaceAll("\"B\":,", "");
            jsonMsg = jsonMsg.replaceAll("\"MC\":00000,", "\"MC\":0,");
            jsonMsg = jsonMsg.replaceAll("\"MC\":,", "");
            jsonMsg = jsonMsg.replaceAll(/\r/gi, "");
            jsonMsg = jsonMsg.replaceAll("", "");
    
            jsonMsg = JSON.parse(jsonMsg);
    
            var sv = jsonMsg[0].SV;
            if (sv) {
    
                var val = checkPreviousSV(sv);
                if (val == 1) {
                    $scope.calibrateArray.push({
                        sv_value: sv,
                        count: 1
                    });
                }
    
            }
    
        }
    
        $scope.reset = function () {
            $scope.calibrateArray = [];
        };
    
        $scope.saveCalibration = function (s, f) {
            $scope.svArray.push({
                fuel_level: f,
                sv_value: s.sv_value
            });
            $scope.finalSvArray.push([s.sv_value, parseInt(f)]);
        };
    
        $scope.notify = function () {
            var obj = {
                imei: $scope.imei,
                values: $scope.finalSvArray,
                time: new Date().getTime(),
                sv_obj: $scope.svArray
            };
            console.log(obj);
            var token = localStorage.getItem("UserToken");
            var url = 'https://apis.intangles.com/fuel/notifycalibration?' + "&token=" + token;
            //var url = 'http://localhost:1234/fuel/notifycalibration'
            post(url, obj).then(function (res) {
                console.log(res);
                if (res.data.status.code === 200)
                    alert('Calibrations values Sent');
            });
        };
    
        vm.submitTest = function (imei) {
            var testCases = vm.testing.tests[imei].test_cases;
            end_time = new Date().valueOf();
            var obj = {
                imei: imei,
                logs: testCases,
                status: vm.testing.tests[imei].status,
                idevice_id: imei,
                start_time: vm.testing.tests[imei].start_time,
                end_time: end_time,
                tested_under_product: vm.selectedProduct
            };
            vm.testing.tests[imei].test_timing = obj.test_timing = obj.end_time - obj.start_time;
            vm.testing.tests[imei].end_time = obj.end_time = obj.end_time;
    
            if (obj.status == 2)
                vm.testing.tests[imei].status = 3;
    
            var url = BASEURL + 'idevicetestlogs/create?' + "&token=" + vm.token;
            post(url, obj).then(function (res) {
                if (res.data.status.code == 200 || (res.data.status.code == 201)) {
                    clientForTesting.unsubscribe('uimsg-' + imei, function (err) {
                        // console.log(err);
                    });
                }
            }, function (err) {
                if (err) {
                    vm.testing.tests[imei].status = 0;
                    vm.removeTestCase(imei, true);
                }
                // console.log(err);
            });
        };
    
        $scope.testModeNotify = function (mode) {
            var obj = {
                imei: $scope.imei,
                logs: '',
                status: 0,
                idevice_id: $scope.device_id
            };
            if (mode == "obd") {
    
                $scope.obd_obj = [{
                    "name": "Handshake",
                    "status": $scope.obd_handshake == true ? 0 : 1,
                    log: $scope.obd_handshake_condition,
                    "err_msg": $scope.obd_handshake_errmsg
                },
                {
                    "name": "Setting",
                    "status": $scope.dev_setting == true ? 0 : 1,
                    log: $scope.dev_setting_condition,
                    "err_msg": $scope.dev_setting_errmsg
                },
                {
                    "name": "Gps",
                    "status": $scope.obd_gps == true ? 0 : 1,
                    log: $scope.obd_gps_condition,
                    "err_msg": $scope.obd_gps_errmsg
                },
                {
                    "name": "Message",
                    "status": $scope.obd_message == true ? 0 : 1,
                    log: $scope.obd_message_condition,
                    "err_msg": $scope.obd_message_errmsg
                }
                ];
                obj.logs = $scope.obd_obj;
            }
            if (mode == "fuel") {
    
                $scope.fuel_obj = [{
                    "name": "Handshake",
                    "status": $scope.vts_handshake == true ? 0 : 1,
                    log: $scope.vts_handshake_condition,
                    "err_msg": $scope.vts_handshake_errmsg
                },
                {
                    "name": "Setting",
                    "status": $scope.vts_setting == true ? 0 : 1,
                    log: $scope.vts_setting_condition,
                    "err_msg": $scope.vts_setting_errmsg
                },
                {
                    "name": "Gps",
                    "status": $scope.vts_gps == true ? 0 : 1,
                    log: $scope.vts_gps_condition,
                    "err_msg": $scope.vts_gps_errmsg
                },
                {
                    "name": "Message",
                    "status": $scope.vts_message == true ? 0 : 1,
                    log: $scope.vts_message_condition,
                    "err_msg": $scope.vts_message_errmsg
                },
                {
                    "name": "Zero DC Value",
                    "status": $scope.zero_value == true ? 0 : 1,
                    log: $scope.zero_value_condition,
                    "err_msg": $scope.zero_value_errmsg
                },
                {
                    "name": "One DC Value",
                    "status": $scope.one_value == true ? 0 : 1,
                    log: $scope.one_value_condition,
                    "err_msg": $scope.one_value_errmsg
                }
                ];
                obj.logs = $scope.fuel_obj;
            }
            //var b = Object.values(obj.logs);
            for (var i = 0; i < obj.logs.length; i++) {
                if (obj.logs[i].status == 1) {
                    obj.status = 1;
                    break;
                }
            }
            obj.start_time = $scope.start_time;
            obj.end_time = $scope.end_time;
            var token = localStorage.getItem("UserToken");
            var url = "https://apis.intangles.com/idevicetestlogs/create?" + "token=" + token;
            console.log('obj', obj);
            //        $scope.counter = 0;
            $interval.cancel(promise);
            obj.logs = JSON.stringify(obj.logs);
    
            post(url, obj).then(function (res) {
                console.log(res);
                if (res.data.status.code === "201")
                    alert("Test Saved");
            });
            //console.log('messageArray',JSON.stringify($scope.messageArray));
        };
    
        function checkPreviousSV(o) {
    
            var current_sv_value = _.findWhere($scope.calibrateArray, {
                sv_value: o
            });
    
            if (current_sv_value == undefined)
                return 1;
    
            if (current_sv_value) {
                for (var j = 0; j < $scope.calibrateArray.length; j++) {
                    if ($scope.calibrateArray[j].sv_value == o)
                        $scope.calibrateArray[j].count = $scope.calibrateArray[j].count + 1;
                }
            }
    
        }
    
        $scope.close = function () {
            unsubscribeAll();
            $scope.subscribeMessage = "Unsubscribed all IMEI's";
            $scope.messageLoading = false;
            // $scope.counter = 0;
            $interval.cancel(promise);
            //$scope.monitor = false;
        };
    
        function unsubscribeAll() {
            for (var index = 0; index < $scope.imeiArray.length; index++) {
                var element = $scope.imeiArray[index];
                if (element.status == true)
                    $scope.imeiArray[index].status = false;
                if (vm.hide_history_tab)
                    client.unsubscribe($scope.imeiArray[index].imei + '/data', function (err) {
                        console.log(err);
                    });
                else
                    client.unsubscribe('uimsg-' + $scope.imeiArray[index].imei, function (err) {
                        console.log(err);
                    });
            }
            return $scope.imeiArray;
        }
    
        function validateImei(imei) {
            if (imei && imei.length > 16)
                var splitedText = imei.split(";");
            if (splitedText && splitedText.length > 0)
                return splitedText[0];
            else
                return imei;
            console.log('splitedText', splitedText);
        }
    
        $scope.searchIdevice = function (viewValue, forTesting) {
            if (!forTesting) {
                if (viewValue.length < 3)
                    return;
            } else if (forTesting == true) {
                if (!viewValue)
                    return _.map($scope.devices.idevices, "imei");
            }
            var token = localStorage.getItem("UserToken");
            // console.log('token',token);
            var url = BASEURL + 'idevice/listV2?psize=25&pnum=1&status=*&query=' + viewValue + "&token=" + token + "&acc_id=" + vm.user.accountId;
            if (vm.is_si_user)
                url += "&showall=true";
    
            $scope.loadingIdevices = true;
            return $q(function (resolve, reject) {
    
                get(url).then(function (res) {
                    $scope.loadingIdevices = false;
                    if (!forTesting)
                        resolve(res.data.idevices);
                    else
                        resolve(_.map(res.data.idevices, "imei"));
                });
    
            });
        };
    
        $scope.loadHistory = function (getLogs, lastEvaluatedTime) {
            if (!getLogs && $scope.nodata)
                return;
            $scope.busy = true;
            if (getLogs) {
                $scope.historyMessages = null;
                $scope.nodata = false;
            }
            var imei = $scope.selectedimei;
            if (!imei || !imei.imei)
                return;
            $scope.data.loading = true;
            var url = BASEURL + `idevice/logsV2/${imei.imei}?psize=${$scope.psize || 8}&token=${vm.token}&`;
            // var url = `https://device.intangles.com/logs?fetch_result_from_multiple_sources=true&psize=` + ($scope.psize || 8) + '&imei=' + imei.imei;
            //var url = 'http://localhost:8201/logs?&psize='+($scope.psize || 8)+'&imei=' + imei.imei;
            if ($scope.fromDate && $scope.fromDate.getTime)
                url += "&from=" + $scope.fromDate.getTime();
            if ($scope.toDate && $scope.toDate.getTime)
                url += "&until=" + $scope.toDate.getTime();
            if ($scope.type && $scope.type != 'false' && $scope.type != 'a')
                url += "&types=" + $scope.type;
            $scope.shareUrl = url;
            if (lastEvaluatedTime)
                url += "&last_t=" + lastEvaluatedTime;
            if ($scope.temp_log_viewer)
                url += "&temp_log_viewer=" + $scope.temp_log_viewer;
            // if (vm.user && vm.user.role && (vm.user.role == 'admin' || vm.user.role == 'developer'))
            //     url += "&privileges=raw_mqtt";
            return $q(function (resolve, reject) {
                get(url).then(function (res) {
                    if (!res || res.status != 200 || !res.data)
                        return;
                    if ($scope.type === 'a') {
                        res.data = filterForAis(res.data);
                        if (!res.data || !res.data.trim())
                            $scope.nodata = true;
                    }
                    // if (!$scope.historyMessages)
                    //     $scope.historyMessages = $sce.trustAsHtml(res.data);
                    // else
                    //     $scope.historyMessages = $sce.trustAsHtml($scope.historyMessages + res.data);
                    if (!$scope.historyMessages)
                        $scope.historyMessages = res.data.logs;
                    else
                        $scope.historyMessages = $scope.historyMessages.concat(res.data.logs);
                    $scope.data.loading = false;
                    //startScroll(res);
                    $scope.last_t = null;
    
                    $scope.last_t = res.data?.last_evaluated_key?.t;
                    if (!$scope.last_t)
                        $scope.nodata = true;
    
                    // if (res.headers) {
                    //     $scope.last_t = res.headers('lastevaluatedtime');
                    //     if (!$scope.last_t)
                    //         $scope.nodata = true;
                    // }
                    $scope.busy = false;
                }).catch(function (error) {
                    $scope.data.loading = false;
                });
            });
        };
    
        function filterForAis(data) {
            if (!data)
                return data;
            var splits = data.split('<br><br>');
            return splits.filter(function (string) {
                return string.indexOf('TCP') > -1;
            }).join('<br/><br/>');
        }
    
        // function startScroll(res) {
        //     $(window).unbind('scroll');
        //     $(window).scroll(function () {
        //         if ($(window).scrollTop() == $(document).height() - $(window).height()) {
        //             var last_t = null;
        //             if (res.headers)
        //                 last_t = res.headers('lastevaluatedtime');
        //             if (!$scope.data.loading)
        //                 $scope.loadHistory(null, last_t);
        //         }
        //     });
        // }
    
        function get(url) {
    
            return $http({
                url: url,
                method: "get",
                headers: {
                    'Content-Type': 'application/json, text/plain, */*',
                }
            })
        }
    
        function post(url, request) {
            return $http({
                // method: 'GET',
                url: url,
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    /*or whatever type is relevant */
                    'Accept': 'application/json' /* ditto */
                },
                data: request
            })
        }
    
        function testMode(a) {
    
            jsonMsg = a.msg;
            jsonMsg = jsonMsg.replaceAll("\"B\":000,", "\"B\":0,");
            jsonMsg = jsonMsg.replaceAll("\"B\":,", "");
            jsonMsg = jsonMsg.replaceAll("\"MC\":00000,", "\"MC\":0,");
            jsonMsg = jsonMsg.replaceAll("\"MC\":,", "");
            jsonMsg = jsonMsg.replaceAll(/\r/gi, "");
    
            try {
                jsonMsg = JSON.parse(a.msg);
            } catch (err) {
                toastr.error("invalid packet coming from device, Unable to read and parse", a);
                toastr.error(err.toString());
                console.log(err);
                return;
            }
            //console.log( JSON.stringify(jsonMsg) );
            // test obd
            if ($scope.failed)
                return;
    
    
            if (a.tp === 'obd') {
                testObd(jsonMsg, a.c);
                return;
            }
    
            if (a.tp === 'settings') {
                testSettings(jsonMsg, a.c);
                return;
            }
    
            if (a.tp === 'gen') {
                testGen(jsonMsg, a.c);
                return;
            }
    
            // test vts and fuel params
            if (a.tp === "message")
                testFuelAndVTS(jsonMsg, a.c);
        }
    
        function testObd(a, imei) {
    
            if (Array.isArray(a)) {
                for (let i = 0; i < a.length; i++) {
                    // will iterate on all the packets under an array and check the possiblity of success
                    check(a[i]);
                }
            } else {
                return check(a);
            }
    
            function check(pkt) {
                if (pkt.hasOwnProperty("TV")) {
                    // handshake
                    obdHandshake(pkt, imei);
                } else if (pkt.hasOwnProperty("G") || pkt.hasOwnProperty("GA")) {
                    // GPS
                    obdGps(pkt, imei);
                } else if (pkt.hasOwnProperty("P") || pkt.hasOwnProperty("DT") || pkt.hasOwnProperty("E")) {
                    // Data Packet
                    obdMessage(pkt, imei);
                } else if (pkt.hasOwnProperty('set')) {
                    testSettings(pkt, imei);
                } else
                    console.log("unknown packet");
            }
            // obdSetting(a,imei);
        }
    
    
        function testGen(a, imei) {
            if (Array.isArray(a)) {
                for (let i = 0; i < a.length; i++) {
                    check(a[i]);
                }
            } else {
                check(a);
            }
    
            function check(pkt) {
                if (pkt.hasOwnProperty("TV")) {
                    // handshake
                    genHandshake(pkt, imei);
                } else if (pkt.hasOwnProperty("GD") || pkt.hasOwnProperty("GT")) {
                    // GPS
                    genGps(pkt, imei);
                }
                else if (pkt.hasOwnProperty("GENF") || pkt.hasOwnProperty("PRT")) {
                    // Data Packet
                    genMessage(pkt, imei);
                }
            }
        }
    
        function testFuelAndVTS(a, imei) {
            if (Array.isArray(a)) {
                for (let i = 0; i < a.length; i++) {
                    // will iterate on all the packets under an array and check the possiblity of success
                    check(a[i]);
                }
            } else {
                check(a);
            }
    
            function check(pkt) {
                if (pkt.hasOwnProperty("TV") || pkt.hasOwnProperty("CORE")) {
                    vtsHandshake(pkt, imei);
                } else if (pkt.hasOwnProperty("G") || pkt.hasOwnProperty("GA")) {
                    vtsGps(pkt, imei);
                } else {
                    console.log("invalid packet received");
                }
                zeroValueCheck(pkt, imei);
                oneValueCheck(pkt, imei);
                vtsAndFuelMessage(pkt, imei);
            }
    
        }
    
        $scope.commandsList = [{
            "commands": "GETAPN",
            "description": "Get APN for each service provider",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETAPN;"
        },
        {
            "commands": "GETEMDATA",
            "description": "Get emergency data repetition rate in seconds",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETEMDATA;"
        },
        {
            "commands": "GETEMRDUR",
            "description": "Get duration in seconds for which emergency data will be sent",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETEMRDUR;"
        },
        {
            "commands": "GETESMS",
            "description": "Get phone number to which emergency alerts will be sent",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETESMS;"
        },
        {
            "commands": "GETHARSHBRAKE",
            "description": "Get threshold for harsh brake event",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETHARSHBRAKE;"
        },
        {
            "commands": "GETHLTRATE",
            "description": "Get health status packet repetition rate in seconds",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETHLTRATE;"
        },
        {
            "commands": "GETIGOFF",
            "description": "Get VLT data repetition rate in seconds when ignition is off",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETIGOFF;"
        },
        {
            "commands": "GETIGON",
            "description": "Get VLT data repetition rate in seconds when ignition is on",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETIGON;"
        },
        {
            "commands": "GETIP",
            "description": "Get IP address to which normal and emergency data packets are sent",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETIP;"
        },
        {
            "commands": "GETOVERSPEED",
            "description": "Get threshold for over-speeding event",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETOVERSPEED;"
        },
        {
            "commands": "GETRASHTURN",
            "description": "Get threshold for rash turn event",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETRASHTURN;"
        },
        {
            "commands": "GETSLEEPTIME",
            "description": "Get time duration in seconds after which device goes into sleep mode",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETSLEEPTIME;"
        },
        {
            "commands": "GETVEH",
            "description": "Get registration number of vehicle on which device is deployed",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETVEH;"
        },
        {
            "commands": "GETFRAMENO",
            "description": "Get frame number of current packet",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETFRAMENO;"
        },
        {
            "commands": "GETGSMST",
            "description": "Get network signal strength",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETGSMST;"
        },
        {
            "commands": "GETIMEI",
            "description": "Get device IMEI",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETIMEI;"
        },
        {
            "commands": "SETAPNprov1:APN1,prov2:APN2@",
            "description": "Set APN for each service provider (eg sleep/type:CMDSETAPNIdea:SENSEM2M,BSNL:SENSEM2M)",
            "user_input": "prov1:APN1 and prov2:APN2",
            "input": [{
                'type': 'text',
                'value': '',
                'display_name': 'APN for provider 1'
            }, {
                'type': 'text',
                'value': '',
                'display_name': 'APN for provider  2'
            }],
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETAPNIdea:SENSEM2M,BSNL:SENSEM2M@;",
            "new_url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETAPNvalue1,value2@;"
    
        },
        {
            "commands": "SETEMDATAti@",
            "description": "Set emergency data repetition rate in seconds (eg sleep/type:CMDSETEMDATA10)",
            "user_input": "ti",
            "input": [{
                'type': 'text',
                'value': '',
                'display_name': 'Set emergency data repetition rate in seconds'
            }],
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETEMDATA10@;",
            "new_url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETEMDATAvalue1@;"
        },
        {
            "commands": "SETEMRDURti@",
            "description": "Set duration in seconds for which emergency data will be sent (eg sleep/type:CMDSETEMRDUR300)",
            "user_input": "ti",
            "input": [{
                'type': 'text',
                'value': '',
                'display_name': 'duration in seconds for which emergency data will be sent'
            }],
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETEMRDURvalue1@;",
            "new_url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETEMRDURvalue1@;"
        },
        {
            "commands": "SETESMSphoneNo@",
            "description": "Set phone number to which emergency alerts will be sent (eg sleep/type:CMDSETESMS+919892123321)",
            "user_input": "phoneNo",
            "input": [{
                'type': 'text',
                'value': '',
                'display_name': 'phone number to which emergency alerts will be sent'
            }],
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETESMSvalue1@;",
            "new_url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETESMSvalue1@;",
        },
        {
            "commands": "SETHARSHBRAKEthr@",
            "description": "Set threshold for harsh brake event (eg sleep/type:CMDSETHARSHBRAKE20)",
            "user_input": "thr",
            "input": [{
                'type': 'text',
                'value': '',
                'display_name': 'threshold for harsh brake event'
            }],
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETHARSHBRAKEvalue1@;",
            "new_url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETHARSHBRAKEvalue1@;"
        },
        {
            "commands": "SETHLTDATAti@",
            "description": "Set health status packet repetition rate in seconds (eg sleep/type:CMDSETHLTDATA60)",
            "user_input": "ti",
            "input": [{
                'type': 'text',
                'value': '',
                'display_name': 'health status packet repetition rate in seconds'
            }],
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETHLTDATAvalue1@;",
            "new_url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETHLTDATAvalue1@;"
        },
        {
            "commands": "SETIGOFFti@",
            "description": "Set VLT data repetition rate in seconds when ignition is off (eg sleep/type:CMDSETIGOFF30)",
            "user_input": "ti",
            "input": [{
                'type': 'text',
                'value': '',
                'display_name': 'VLT data repetition rate in seconds when ignition is off'
            }],
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETIGOFFvalue1@;",
            "new_url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETIGOFFvalue1@;",
        },
        {
            "commands": "SETIGONti@",
            "description": "Set VLT data repetition rate in seconds when ignition is on (eg sleep/type:CMDSETIGON10)",
            "user_input": "ti",
            "input": [{
                'type': 'text',
                'value': '',
                'display_name': 'VLT data repetition rate in seconds when ignition is on'
            }],
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETIGONvalue1@;",
            "new_url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETIGONvalue1@;"
        },
        {
            "commands": "SETIPip1:port1,ip2:port2@",
            "description": "Set IP address to which normal and emergency data packets are sent (eg sleep/type:CMDSETIPdevice3.intangles.com:5001,device4.intangles.com:5002)",
            "user_input": "ip1:port1 and ip2:port2",
            "input": [{
                'type': 'text',
                'value': '',
                'display_name': 'IP address 1'
            }, {
                'type': 'text',
                'value': '',
                'display_name': 'IP address 2'
            }],
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETIPvalue1,value2@;",
            "new_url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETIPvalue1,value2@;"
        },
        {
            "commands": "SETOVERSPEEDthr@",
            "description": "Set threshold for over-speeding event (eg sleep/type:CMDSETOVERSPEED25)",
            "user_input": "thr",
            "input": [{
                'type': 'text',
                'value': '',
                'display_name': 'threshold for over-speeding event'
            }],
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETOVERSPEEDvalue1@;",
            "new_url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETOVERSPEEDvalue1@;"
        },
        {
            "commands": "SETRASHTURNthr@",
            "description": "Set threshold for rash turn event (sleep/type:CMDSETRASHTURN30)",
            "user_input": "thr",
            "input": [{
                'type': 'text',
                'value': '',
                'display_name': 'threshold for rash turn event'
            }],
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETRASHTURNvalue1@;",
            "new_url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETRASHTURNvalue1@;"
        },
        {
            "commands": "SETSLEEPTIMEti@",
            "description": "Set time duration in seconds after which device goes into sleep mode (eg sleep/type:CMDSETSLEEPTIME180)",
            "user_input": "ti",
            "input": [{
                'type': 'text',
                'value': '',
                'display_name': 'time duration in seconds after which device goes into sleep mode'
            }],
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETSLEEPTIMEvalue1@;",
            "new_url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETSLEEPTIMEvalue1@;"
        },
        {
            "commands": "SETVEHvehNo@",
            "description": "Set registration number of vehicle on which device is deployed (eg sleep/type:CMDSETVEHMH12KK1234)",
            "user_input": "vehNo",
            "input": [{
                'type': 'text',
                'value': '',
                'display_name': 'registration number of vehicle on which device is deployed'
            }],
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETVEHvalue1@;",
            "new_url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETVEHvalue1@;"
        },
        {
            "commands": "CLR-EMRFLAG",
            "description": "Clear panic button alert",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDCLR-EMRFLAG;"
        },
        {
            "commands": "CLR-FRAMENO",
            "description": "Reset frame counter to 0",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDCLR-FRAMENO;"
        },
        {
            "commands": "COLD",
            "description": "Send cold start to GNSS module",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:COLD;"
        },
        {
            "commands": "WARM",
            "description": "Send warm start to GNSS module",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:WARM;"
        },
        {
            "commands": "HOT",
            "description": "Send hot start to GNSS module",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:HOT;"
        },
        {
            "commands": "SIM",
            "description": "change Service provider for AIS device",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:SIM;"
        },
        {
            "commands": "ESIM",
            "description": "Switch to embedded SIM",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:ESIM;"
        },
        {
            "commands": "NSIM",
            "description": "Switch to normal SIM",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:NSIM;"
        },
        {
            "commands": "rtcRst",
            "description": "Reset onboard RTC, provided fix 3 is available",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:rtcRst;"
        },
        {
            "commands": "delete",
            "description": "Delete data on M66/WP",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:delete;"
        },
        {
            "commands": "delete",
            "description": "Delete data on external flash",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:delete EF;"
        },
        {
            "commands": "SETHARSHACCthr@",
            "description": "Set threshold for harsh acceleration event  (sleep/type:SETHARSHACC30@)",
            "user_input": "thr",
            "input": [{
                'type': 'text',
                'value': '',
                'display_name': 'threshold for harsh turn event'
            }],
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETHARSHACCvalue1@;",
            "new_url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDSETHARSHACCvalue1@;"
        },
        {
            "commands": "GVer",
            "description": "Send GVer command to get GPS module firmware version",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:GVer;"
        },
        {
            "commands": "GETHARSHACC",
            "description": "Get threshold for harsh acceleration  event",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:CMDGETHARSHACC;"
        },
        {
            "commands": "sflash",
            "description": "Clear Faults",
            "user_input": "",
            "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:sflash;"
        }
        ];
    
        $scope.commandsListForAssemblyTeam = [
            {
                "commands": "ESIM",
                "description": "Switch to embedded SIM",
                "user_input": "",
                "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:ESIM;"
            },
            {
                "commands": "NSIM",
                "description": "Switch to normal SIM",
                "user_input": "",
                "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:NSIM;"
            },
            {
                "commands": "rtcRst",
                "description": "Reset onboard RTC, provided fix 3 is available",
                "user_input": "",
                "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:rtcRst;"
            },
            {
                "commands": "delete",
                "description": "Delete data on M66/WP",
                "user_input": "",
                "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:delete;"
            },
            {
                "commands": "delete",
                "description": "Delete data on external flash",
                "user_input": "",
                "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:delete EF;"
            }, {
                "commands": "sflash",
                "description": "Clear Faults",
                "user_input": "",
                "url": "http://device-commands.intangles.com:4321/cmd/IMEIID/sleep/type:sflash;"
            }
        ];
    
        $scope.searchCommands = function (query) {
            let list = vm.user?.role === 'assembly' ? $scope.commandsListForAssemblyTeam : $scope.commandsList;
            if (query) {
                var returnArray = [];
                _.filter(list, function (currentItem) {
                    if (currentItem.description.toLowerCase().indexOf(query) > -1)
                        returnArray.push(currentItem);
                });
                return returnArray;
            } else
                return list;
        };
    
        $scope.setCommand = function (info) {
            $scope.selectedCommand = info;
            if (!info.input) {
                if (info.new_url)
                    $scope.selectedCommand.final_url = info.new_url;
                else
                    $scope.selectedCommand.final_url = info.url;
            } else
                $scope.selectedCommand.final_url = info.url;
            $scope.selectedCommand.final_url = $scope.selectedCommand.final_url.replace(/IMEIID/g, $scope.selectedimei.imei);
        };
    
        $scope.sendCommand = function () {
            if ($scope.selectedimei && $scope.selectedimei.id && $scope.selectedCommand && $scope.selectedCommand.final_url) {
                console.log($scope.selectedCommand.final_url);
                get($scope.selectedCommand.final_url).then(function (res) {
                    // console.log(res);
                    $scope.selectedCommand = undefined;
                }, function (error) {
                    console.log(error);
                });
            }
        };
    
        $scope.makeURL = function (info) {
            if ($scope.selectedCommand) {
                if ($scope.selectedCommand.new_url)
                    $scope.selectedCommand.temp_url = $scope.selectedCommand.new_url;
                else
                    $scope.selectedCommand.temp_url = $scope.selectedCommand.url;
                if ($scope.selectedCommand.input && $scope.selectedCommand.input.length > 0) {
                    var str = $scope.selectedCommand.new_url;
                    var res = str.replace(/value1/g, $scope.selectedCommand.input[0].value);
                    if ($scope.selectedCommand.input && $scope.selectedCommand.input.length > 1)
                        var res = res.replace(/value2/g, $scope.selectedCommand.input[1].value);
                    $scope.selectedCommand.final_url = res;
                }
                if ($scope.selectedimei && $scope.selectedimei.imei)
                    $scope.selectedCommand.final_url = $scope.selectedCommand.final_url.replace(/IMEIID/g, $scope.selectedimei.imei);
            }
        };
    
        $scope.getOnlineStatus = function (idevice) {
            unsubscribeAll();
            $scope.imeiArray.push({
                imei: idevice.imei,
                status: true
            });
            $scope.imei = idevice.imei;
            $scope.device_id = idevice.id;
            var token = localStorage.getItem("UserToken");
            var url = 'https://apis.intangles.com/idevice/' + $scope.imei + '/isonline?' + "token=" + token;
            return $q(function (resolve, reject) {
                get(url).then(function (res) {
    
                    if (res.data.isonline == true) {
                        $scope.isOnline = 'Online';
                    } else {
                        $scope.isOnline = 'Offline';
                    }
                });
            });
        };
    
        $scope.enable_mechanical = false;
        $scope.enable_stickers = false;
        vm.oqc_selectedimei = null;
    
        $scope.getImeiInfoForOqc = async function (idevice) {
            //let info = await getIMEIInfoByIMEI(idevice.imei);
            vm.oqc_selectedimei = idevice;
            if (idevice.assembly.TST.status === "success")
                $scope.enable_mechanical = true;
            if (idevice.assembly.PKG.status === "success") {
                $scope.enable_stickers = true;
                $scope.enable_mechanical = false;
            }
        }
    
        $scope.sendL2UpgCommand = function () {
            if ($scope.imei) {
                // http://device-commands.intangles.com:4321/cmd/868325024832133/sleep/type:L2upgrade,file:l26p0p4.bin
                var url = 'http://device-commands.intangles.com:4321/cmd/' + $scope.imei + '/sleep/type:L2upgrade,file:l26p0p4.bin';
                get(url).then(function (res) {
                    console.log('L2 upgrade', res);
                });
            }
        };
    
        $scope.sendDeviceReset = function (imei) {
            if (!imei)
                imei = $scope.imei;
            if (imei) {
                var url = 'http://device-commands.intangles.com:4321/cmd/' + imei + '/sleep/type:deviceRst;';
                get(url).then(function (res) {
                    console.log(res);
                });
            }
        }
    
        vm.sendRTCReset = function (imei) {
            var url = 'http://device-commands.intangles.com:4321/cmd/' + imei + '/sleep/type:rtcRst;';
            get(url).then(function (res) {
                console.log(res);
            });
        }
    
        $scope.clearUpgradeCommand = function () {
            if ($scope.imei) {
                // http://device-commands.intangles.com:4321/cmd/868325024832133/sleep/type:L2upgrade,file:l26p0p4.bin
                var token = localStorage.getItem("UserToken");
                var url = 'https://apis.intangles.com/idevice/upgrade/unmark?' + "token=" + token;
                var data = {
                    imeis: [$scope.imei]
                }
                post(url, data).then(function (res) {
                    console.log(res);
                });
            }
        }
    
        $scope.copyLink = function () {
            var shareUrl = document.getElementById("shareUrl");
            // Select it
            shareUrl.select();
            // Copy its contents
            document.execCommand("Copy");
            alert("Link Copied! - " + shareUrl.value);
        }
    
        function genHandshake(pkt, imei) {
    
            if (!vm.testing.tests[imei].test_cases['gen_handshake']) {
                console.log("not subscribd to the test case of handshake, hence skipping");
                return;
            }
    
            if (pkt && pkt.hasOwnProperty("H") && pkt.H === 1)
                return;
    
            if (pkt && pkt.hasOwnProperty('SIM'))
                vm.testing.tests[imei].all_test['gen_handshake']['sim'] = {
                    ...vm.testing.tests[imei].all_test['gen_handshake']['sim'],
                    status: 1,
                    status_text: "Passed",
                };
            if (pkt && pkt.hasOwnProperty('TV'))
                vm.testing.tests[imei].all_test['gen_handshake']['tv'] = {
                    ...vm.testing.tests[imei].all_test['gen_handshake']['tv'],
                    status: 1,
                    status_text: "Passed",
                };
            if (pkt && pkt.hasOwnProperty('GC')) {
                if ((vm.selectedProduct == 'GEN-US24' && pkt.GC == 'DSE_6120_J1939') || (vm.selectedProduct == 'GEN-R424' && pkt.GC == 'DSE_7310') || (vm.selectedProduct == 'GEN-R4AW' && pkt.GC == 'EMKO_TR1'))
                    vm.testing.tests[imei].all_test['gen_handshake']['gc'] = {
                        ...vm.testing.tests[imei].all_test['gen_handshake']['gc'],
                        status: 1,
                        status_text: "Passed",
                    };
            }
            if (pkt && pkt.hasOwnProperty('STM'))
                vm.testing.tests[imei].all_test['gen_handshake']['stm'] = {
                    ...vm.testing.tests[imei].all_test['gen_handshake']['stm'],
                    status: 1,
                    status_text: "Passed",
                };
            
            function checkAbsecentFields(pkt) {
                $scope.gen_handshake_condition = pkt;
                $scope.gen_handshake_errmsg = [];
                vm.testing.tests[imei].test_cases['gen_handshake'].message = pkt;
                if (!pkt.TV)
                    $scope.gen_handshake_errmsg.push("M66 not present");
                if (!pkt.SIM)
                    $scope.gen_handshake_errmsg.push("Sim not present");
                if (!pkt.STM)
                    $scope.gen_handshake_errmsg.push("STM not present");
                if (!pkt.GC)
                    $scope.gen_handshake_errmsg.push("GC not present");
                if (vm.selectedProduct == 'GEN-US24' && pkt.GC != 'DSE_6120_J1939')
                    $scope.gen_handshake_errmsg.push("Wrong GC version");
                if (vm.selectedProduct == 'GEN-R424' && pkt.GC != 'DSE_7310')
                    $scope.gen_handshake_errmsg.push("Wrong GC version");
                vm.testing.tests[imei].test_cases['gen_handshake'].errors = $scope.gen_handshake_errmsg;
            }
            checkAbsecentFields(pkt);
            if (vm.testing.tests[imei].test_cases['gen_handshake'].errors.length > 0) return;
    
            for (var key in vm.testing.tests[imei].all_test['gen_handshake']) {
                if (vm.testing.tests[imei].all_test['gen_handshake'].hasOwnProperty(key)) {
                    vm.testing.tests[imei].all_test['gen_handshake'][key] = {
                        ...vm.testing.tests[imei].all_test['gen_handshake'][key],
                        status: 1,
                        status_text: "Passed",
                    };
                }
            }
            $scope.gen_handshake_errmsg = [];
            $scope.gen_gps_condition = pkt;
            vm.testing.tests[imei].test_cases['gen_handshake'].status = true;
            vm.testing.tests[imei].test_cases['gen_handshake'].message = pkt;
        }
    
        /**
         * 
         * @param {Object} a - this will always be an object, array of object is being handled at one level above
         * @param {String} imei - imei for which the packet has come
         */
        function obdHandshake(a, imei) {
    
            if (!vm.testing.tests[imei].test_cases['handshake']) {
                console.log("not subscribd to the test case of handshake, hence skipping");
                return;
            }
    
            function checkAbsecentFields(pkt) {
                // this adds the failure reasons in err_msgs
                $scope.obd_handshake_condition = pkt;
                $scope.obd_handshake_errmsg = [];
                vm.testing.tests[imei].test_cases['handshake'].message = pkt;
    
                if (!pkt.VIN)
                    $scope.obd_handshake_errmsg.push("VIN not present");
                if (!pkt.OP)
                    $scope.obd_handshake_errmsg.push("Protocol not present");
                if (!pkt.SIM)
                    $scope.obd_handshake_errmsg.push("Sim not present");
                if (!pkt.STM)
                    $scope.obd_handshake_errmsg.push("STM not present");
                if (!pkt.SID)
                    $scope.obd_handshake_errmsg.push("Sim Id not present");
                if (!pkt.TV)
                    $scope.obd_handshake_errmsg.push("TV Id not present");
    
                vm.testing.tests[imei].test_cases['handshake'].errors = $scope.obd_handshake_errmsg;
            }
    
            function markSuccess(pkt) {
                $scope.obd_handshake_errmsg = [];
                $scope.obd_handshake_condition = pkt;
                $scope.obd_handshake = true;
                vm.testing.tests[imei].test_cases['handshake'].status = true;
                vm.testing.tests[imei].test_cases['handshake'].message = pkt;
                for (var key in vm.testing.tests[imei].all_test['handshake']) {
                    if (vm.testing.tests[imei].all_test['handshake'].hasOwnProperty(key)) {
                        vm.testing.tests[imei].all_test['handshake'][key] = {
                            ...vm.testing.tests[imei].all_test['handshake'][key],
                            status: 1,
                            status_text: "Passed",
                        };
                    }
                }
            }
    
            if (a && a.hasOwnProperty("H") && a.H === 1)
                return;
    
            if (vm.selectedProduct == 'Max-Cube') {
                if (a.hasOwnProperty('VIN') && a.VIN != 'DAA') {
                    // if the handshake is VIN-handshake
                    // then also its a success case but will need OP field too which operational protocol of the vehicle
                    if (a.hasOwnProperty('OP')) {
                        markSuccess(a);
                    } else {
                        checkAbsecentFields(a);
                    }
                }
                else
                    checkAbsecentFields(a);
            } else if (vm.selectedProduct == "OBD-MEV") {
                if (a.hasOwnProperty('VIN')) {
                    console.log("Lavdya VIN Matching 1770")
                if(a['VIN'] == "MB7U8CLLFLJB30465") {
                    markSuccess(a);
                } else {
                    console.log("VIN did not matched")
                    console.log(a)
                }
                }
                
            } else {
                if (a.hasOwnProperty('VIN') && a.VIN != 'DAA') {
                    // if the handshake is VIN-handshake
                    // then also its a success case but will need OP field too which operational protocol of the vehicle
                    if (a.hasOwnProperty('OP')) {
                        markSuccess(a);
                    } else {
                        checkAbsecentFields(a);
                    }
                } else if (a.hasOwnProperty('TV')) {
                    // this is when we receive TV only in the handshake
                    markSuccess(a);
                } else if (vm.testing.tests[imei].test_cases['handshake'].status === undefined) {
                    checkAbsecentFields(a);
                }
            }
        }
    
        vm.checkTestStatus = function (imei) {
    
            var testCases = vm.testing.tests[imei].test_cases;
            var status = true;
            for (const key in testCases) {
                if (testCases.hasOwnProperty(key)) {
                    if (testCases[key].status != true) {
                        status = false;
                        break;
                    }
                }
            }
            return status;
        };
    
        vm.setTestResult = function (imei) {
            vm.testing.tests[imei].test_cases['final'] = {
                status: false
            };
            vm.testing.tests[imei].end_time = new Date().valueOf();
            vm.submitTest(imei);
            // create final test case to send test logs
            // send test logs
        };
    
        vm.expandTestCases = function name(type) {
            if (type == 'expand')
                vm.testCases.map(t => t.showAnchor = true);
            if (type == 'collapse')
                vm.testCases.map(t => t.showAnchor = false);
        };
    
        /*
        TEST DEFINATION
           0 - failed
           1 - completed
           2 - ongoing
           3 - aborted
        */
    
        /**
         * 
         * @param {String} dstr - DATE of format DDMMYY
         * @param {String} tstr - TIME of format HHmmss
         */
        function validateDateTime(dstr, tstr) {
            let dt = moment(`${dstr}T${tstr} +0000`, "DDMMYYYYTHHmmss Z"); // as packet always has GMT time
            let curr = moment().add(2, 'minute'); // margin of 02min
            let two_day_back = moment().subtract(30, 'day'); // live data with date time 02 days back is also not acceptable
    
            if (!dt.isValid()) return false;
            if (dt.isAfter(curr)) return false;
            if (dt.isBefore(two_day_back)) return false;
    
            return true;
        }
        function genGps(pkt, imei) {
            if (!vm.testing.tests[imei].test_cases['gen_gps']) {
                console.log("not subscribd to the test case of GPS, hence skipping");
                return;
            }
    
            if (vm.checkTestStatus(imei) == true) {
                vm.testing.tests[imei].status = 1;
                vm.setTestResult(imei);
            }
    
            if (vm.testing.tests[imei].test_cases['gen_gps'].status && vm.testing.tests[imei].test_cases['gen_gps'].status == true)
                return;
    
            if (pkt && pkt.hasOwnProperty("H") && pkt.H === 1 && pkt.H == 1)
                return;
    
            let issues = [];
    
            if (pkt && pkt.GD) {
                vm.testing.tests[imei].all_test['gen_gps']['gd'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['gd'],
                    status: 1,
                    status_text: "Passed",
                };
            }
            if (pkt && pkt.GT) {
                vm.testing.tests[imei].all_test['gen_gps']['gt'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['gt'],
                    status: 1,
                    status_text: "Passed",
                };
            }
    
            if (pkt && pkt.G) {
                vm.testing.tests[imei].all_test['gen_gps']['g'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['g'],
                    status: 1,
                    status_text: "Passed",
                };
            }
    
            if (pkt && pkt.GA) {
                vm.testing.tests[imei].all_test['gen_gps']['g'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['g'],
                    status: 1,
                    status_text: "Passed",
                };
            }
    
            if (pkt.hasOwnProperty("F") && pkt["F"] == 3) {
                vm.testing.tests[imei].all_test['gen_gps']['fix'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['fix'],
                    status: 1,
                    status_text: "Passed",
                };
            }
            else
                vm.testing.tests[imei].all_test['gen_gps']['fix'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['fix'],
                    value: pkt['F']
                };
    
            if (pkt.hasOwnProperty("NS") && pkt["NS"] >= 5) {
                vm.testing.tests[imei].all_test['gen_gps']['ns'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['ns'],
                    status: 1,
                    status_text: "Passed",
                };
    
            }
            else
                vm.testing.tests[imei].all_test['gen_gps']['ns'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['ns'],
                    value: pkt["NS"]
                };
    
            if (pkt.hasOwnProperty("DP") && pkt["DP"] < 4) {
                vm.testing.tests[imei].all_test['gen_gps']['dp'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['dp'],
                    status: 1,
                    status_text: "Passed",
                };
            }
            else
                vm.testing.tests[imei].all_test['gen_gps']['dp'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['dp'],
                    value: pkt["DP"]
                };
    
            if (pkt.hasOwnProperty("DC") && pkt["DC"] == 1) {
                vm.testing.tests[imei].all_test['gen_gps']['dc'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['dc'],
                    status: 1,
                    status_text: "Passed",
                };
            }
            else
                vm.testing.tests[imei].all_test['gen_gps']['dc'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['dc'],
                    value: pkt["DC"]
                };
    
            if (pkt.hasOwnProperty("DC3") && pkt["DC3"] > 3500 && vm.selectedProduct != 'OBD-MEV') {
                vm.testing.tests[imei].all_test['gen_gps']['dc3'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['dc3'],
                    status: 1,
                    status_text: "Passed",
                };
            }
            else
                vm.testing.tests[imei].all_test['gen_gps']['dc3'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['dc3'],
                    value: pkt["DC3"]
                };
    
            if (pkt.hasOwnProperty("ST") && pkt["ST"] >= 20) {
                vm.testing.tests[imei].all_test['gen_gps']['st'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['st'],
                    status: 1,
                    status_text: "Passed",
                };
            } else {
                vm.testing.tests[imei].all_test['gen_gps']['st'] = {
                    ...vm.testing.tests[imei].all_test['gen_gps']['st'],
                    value: pkt["ST"]
                };
            }
    
            function checkAbsecentFieldsAndIssues(msg, submit_rejected) {
    
                vm.testing.tests[imei].test_cases['gen_gps'].message = msg;
                $scope.gen_gps_condition = pkt;
                $scope.gen_gps_errmsg = [];
                //   vm.testing.tests[imei].test_cases['gps'].message = pkt;
                if (msg) {
                    $scope.gen_gps_errmsg = $scope.gen_gps_errmsg.concat(issues);
                    if (!msg.hasOwnProperty("F"))
                        $scope.gen_gps_errmsg.push("Fix not present");
                    if (msg.hasOwnProperty("F") && msg["F"] != 3)
                        $scope.gen_gps_errmsg.push("Fix 3 not present");
    
                    if (!msg.GD)
                        $scope.gen_gps_errmsg.push("GD not present");
                    if (!msg.GT)
                        $scope.gen_gps_errmsg.push("GT not present");
    
                    if (!msg.DP)
                        $scope.gen_gps_errmsg.push("DP not present");
                    if (msg.hasOwnProperty("DP") && msg["DP"] > 4)
                        $scope.gen_gps_errmsg.push("DP greater than 4");
    
                    if (!msg.DC)
                        $scope.gen_gps_errmsg.push("DC not present");
                    if (msg.hasOwnProperty("DC") && msg['DC'] != 1)
                        $scope.gen_gps_errmsg.push("DC not 1");
    
                    if (!msg.NS)
                        $scope.gen_gps_errmsg.push("NS not present");
                    if (msg.hasOwnProperty("NS") && msg['NS'] < 5)
                        $scope.gen_gps_errmsg.push("NS value less than 5");
    
                    if (!msg.DC3)
                        $scope.gen_gps_errmsg.push("DC3 not present");
                    if (msg.hasOwnProperty("DC3") && msg['DC3'] < 3500)
                        $scope.gen_gps_errmsg.push("DC3 value less than 3500");
    
                    if (!msg.ST)
                        $scope.gen_gps_errmsg.push("ST not present");
                    if (msg.hasOwnProperty("ST") && msg['ST'] < 20)
                        $scope.gen_gps_errmsg.push("DC3 value less than 3500");
                }
                vm.testing.tests[imei].test_cases['gen_gps'].errors = $scope.gen_gps_errmsg;
                if (submit_rejected) {
                    vm.testing.tests[imei].test_cases['gen_gps'].status = false;
                    vm.testing.tests[imei].status = 2;
                    return vm.submitTest(imei);
                }
    
            }
    
            checkAbsecentFieldsAndIssues(pkt);
            if (vm.testing.tests[imei].test_cases['gen_gps'].errors.length > 0) return;
    
            vm.testing.tests[imei].test_cases['gen_gps'].status = true;
            vm.testing.tests[imei].test_cases['gen_gps'].message = pkt;
        }
    
        function genMessage(pkt, imei) {
            if (!vm.testing.tests[imei].test_cases['gen_message']) {
                console.log("not subscribed to the test case of message, hence skipping");
                return;
            }
    
            if (vm.checkTestStatus(imei) == true) {
                vm.testing.tests[imei].status = 1;
                vm.setTestResult(imei);
            }
    
            if (vm.testing.tests[imei].test_cases['gen_message'].status && vm.testing.tests[imei].test_cases['gen_message'].status == true)
                return;
    
            if (pkt && pkt.hasOwnProperty("H") && pkt.H === 1 && pkt.H == 1)
                return;
            $scope.gen_message_errmsg = [];
    
            if (pkt && pkt.hasOwnProperty('PRT')) {
                if ((vm.selectedProduct == 'GEN-US24' && pkt.PRT == 'DSE_6120_J1939') || (vm.selectedProduct == 'GEN-R424' && pkt.PRT == 'DSE_7310') || (vm.selectedProduct == 'GEN-R4AW' && pkt.PRT == 'EMKO_TR1'))
                    vm.testing.tests[imei].all_test['gen_message']['prt'] = {
                        ...vm.testing.tests[imei].all_test['gen_message']['prt'],
                        status: 1,
                        status_text: "Passed",
                    };
                else
                    $scope.gen_message_errmsg.push("Wrong PRT version");
            } else
                $scope.gen_message_errmsg.push("No GC version");
    
            if (pkt && pkt.hasOwnProperty('GENF')) {
                vm.testing.tests[imei].all_test['gen_message']['genf'] = {
                    ...vm.testing.tests[imei].all_test['gen_message']['genf'],
                    status: 1,
                    status_text: "Passed",
                };
            } else
                $scope.gen_message_errmsg.push("GENF not present");
    
            if (pkt && pkt.hasOwnProperty('E')) {
                vm.testing.tests[imei].all_test['gen_message']['e'] = {
                    ...vm.testing.tests[imei].all_test['gen_message']['e'],
                    status: 1,
                    status_text: "Passed",
                };
            } else
                $scope.gen_message_errmsg.push("E not present");
    
            if (pkt.hasOwnProperty("DC3") && pkt["DC3"] > 3500) {
                vm.testing.tests[imei].all_test['gen_message']['dc3'] = {
                    ...vm.testing.tests[imei].all_test['gen_message']['dc3'],
                    status: 1,
                    status_text: "Passed",
                };
            } else if (!pkt.DC3)
                $scope.gen_message_errmsg.push("DC3 not present");
            else if (pkt && pkt.DC3 && pkt.DC3 < 3500)
                $scope.gen_message_errmsg.push("DC3 value less than 3500");
    
            if (pkt.hasOwnProperty('GEN')) {
                if (vm.selectedProduct == 'GEN-US24') {
                    if (pkt.GEN && pkt.GEN.includes('F004') && pkt.GEN.includes('FEEF') && pkt.GEN.includes('FEFC') && pkt.GEN.includes('FEE5'))
                        vm.testing.tests[imei].all_test['gen_message']['gen'] = {
                            ...vm.testing.tests[imei].all_test['gen_message']['gen'],
                            status: 1,
                            status_text: "Passed",
                        };
                    else
                        $scope.gen_message_errmsg.push("Invalid GEN Message");
    
                } else if (vm.selectedProduct == 'GEN-R424') {
                    if (pkt.GEN && pkt.GEN.includes('G04') && pkt.GEN.includes('G07') && pkt.GEN.includes('E07') && pkt.GEN.includes('G1A'))
                        vm.testing.tests[imei].all_test['gen_message']['gen'] = {
                            ...vm.testing.tests[imei].all_test['gen_message']['gen'],
                            status: 1,
                            status_text: "Passed",
                        };
                    else
                        $scope.gen_message_errmsg.push("Invalid GEN Message");
                } else if (vm.selectedProduct == 'GEN-R4AW') {
                    if (pkt.GEN && pkt.GEN.includes('E07') && pkt.GEN.includes('E03') && pkt.GEN.includes('E04') && pkt.GEN.includes('E12'))
                        vm.testing.tests[imei].all_test['gen_message']['gen'] = {
                            ...vm.testing.tests[imei].all_test['gen_message']['gen'],
                            status: 1,
                            status_text: "Passed",
                        };
                    else
                        $scope.gen_message_errmsg.push("Invalid GEN Message");
                } else {
                    $scope.gen_message_errmsg.push("Invalid GEN Message");
                }
            } else {
                $scope.gen_message_errmsg.push("No GEN Message");
            }
    
            if ($scope.gen_message_errmsg.length > 0) return;
            $scope.gen_message_errmsg = [];
    
            $scope.gen_message = true;
            vm.testing.tests[imei].test_cases['gen_message'].status = true;
            vm.testing.tests[imei].test_cases['gen_message'].message = pkt;
        }
    
        /**
         * The OBD GPS check module is responsible for testing gps-packets sent by OBD devices. It mainly focuses on 
         * G, GA, F, GT, GD fields in first go, but it holds the tests for IBV, EBV and IG values which dependent on 
         * first STM packet to receive
         * @param {Object} pkt - this will always be an object of values, the array of object is being handled one level above
         * @param {String} imei - imei for which data is received
         */
        function obdGps(pkt, imei) {
    
            if (!vm.testing.tests[imei].test_cases['gps']) {
                console.log("not subscribd to the test case of GPS, hence skipping");
                return;
            }
    
            // above test cases
            // status 
            // 0 - pending
            // 1 - pass
            // 2 -fail 
    
            let issues = [];
            if (vm.checkTestStatus(imei) == true) {
                vm.testing.tests[imei].status = 1;
                vm.setTestResult(imei);
            }
    
            let validGpsFix = pkt.hasOwnProperty('F') && pkt["F"] == 3 ? true : false;
            if (!validGpsFix)
                return;
    
            function checkAbsecentFieldsAndIssues(msg, submit_rejected) {
                if (vm.testing.tests[imei].test_cases['gps'].status === undefined) {
                    vm.testing.tests[imei].test_cases['gps'].message = msg;
                    $scope.obd_gps_condition = pkt;
                    $scope.obd_gps_errmsg = [];
                    //   vm.testing.tests[imei].test_cases['gps'].message = pkt;
                    if (msg) {
                        $scope.obd_gps_errmsg = $scope.obd_gps_errmsg.concat(issues);
    
                        if (!msg.hasOwnProperty("F"))
                            $scope.obd_gps_errmsg.push("Fix not present");
                        if (msg.GD)
                            $scope.obd_gps_errmsg.push("GD not present");
                        if (msg.GT)
                            $scope.obd_gps_errmsg.push("GT not present");
                        if (msg.DP)
                            $scope.obd_gps_errmsg.push("DP not present");
                        if (msg.DC)
                            $scope.obd_gps_errmsg.push("DC not present");
                        if (msg.hasOwnProperty("F") && msg["F"] != 3)
                            $scope.obd_gps_errmsg.push("Fix 3 not present");
                    }
                    vm.testing.tests[imei].test_cases['gps'].errors = $scope.obd_gps_errmsg;
                    if (submit_rejected) {
                        vm.testing.tests[imei].test_cases['gps'].status = false;
                        vm.testing.tests[imei].status = 2;
                        return vm.submitTest(imei);
                    }
                }
            }
    
            if (pkt && pkt.hasOwnProperty("H") && pkt.H === 1 && pkt.H == 1)
                return;
    
            if (vm.testing.tests[imei].all_test['xcp']) {
                if (pkt.hasOwnProperty('XCP') && pkt['XCP'] == 1) {
                    vm.testing.tests[imei].all_test['xcp']['xcp'].counter = vm.testing.tests[imei].all_test['xcp']['xcp'].counter + 1;
                    vm.testing.tests[imei].all_test['xcp']['xcp'].valid_gps_count = vm.testing.tests[imei].all_test['xcp']['xcp'].valid_gps_count + 1;
                }
                if (vm.testing.tests[imei].all_test['xcp']['xcp'].counter >= 6 && vm.testing.tests[imei].all_test['xcp']['xcp'].valid_gps_count > 7) {
                    vm.testing.tests[imei].all_test['xcp']['xcp'] = {
                        ...vm.testing.tests[imei].all_test['xcp']['xcp'],
                        status: 1,
                        status_text: "Passed",
                    };
                    vm.testing.tests[imei].test_cases['xcp'].status = true;
                    vm.testing.tests[imei].test_cases['xcp'].message = pkt;
                }
            }
    
            if (pkt && pkt.GD && pkt.GT && pkt.hasOwnProperty('DP') && pkt.hasOwnProperty('DC') &&
                pkt.hasOwnProperty('GD') && pkt.hasOwnProperty('GT')) {
                // checking timestamp validity as well
    
                // validation of date time
                let dstr = pkt.GD;
                let tstr = pkt.GT;
    
                if (!validateDateTime(dstr, tstr)) {
                    issues.push("Invalid Date Time in the live-packet");
                }
    
                if (parseInt(pkt.DC) !== 1) issues.push(`DC=${pkt.DC} coming from device`);
    
                let dp = parseFloat(pkt.DP);
                // if (!(dp > 0 && dp < 2.5)) issues.push(`Invalid DP value from device, DP: ${dp}`);
    
                vm.testing.tests[imei].buffer["gps"].push(pkt);
    
                let submit_rejected = false;
    
                let min_EBV = 3300; //3300;
                let max_EBV = 4095;
                let min_IBV = 3000; //3000
                let max_IBV = 4095;
                if (pkt.hasOwnProperty("IG") || pkt.hasOwnProperty("EBV") || pkt.hasOwnProperty("IBV")) {
                    if (
                        pkt.IG === 1 &&
                        pkt.EBV >= min_EBV && pkt.EBV <= max_EBV &&
                        pkt.IBV >= min_IBV && pkt.IBV <= max_IBV
                    ) {
                        console.log("no need to wait for more packets of GPS & OBD, test for {IG, EBV, IBV} already successful");
    
                    } else if ("message" in vm.testing.tests[imei].test_cases) {
                        if (
                            vm.testing.tests[imei].buffer["message"].length <= 1 &&
                            vm.testing.tests[imei].buffer["gps"].length < 20
                        ) {
                            console.log(`{IG, EBV, IBV} is coming in packet, waiting for enough time of 2 obd or 20 gps packets`);
                            console.log(`received till now obd: ${vm.testing.tests[imei].buffer["message"].length} \n gps: ${vm.testing.tests[imei].buffer["gps"].length}`);
                            return;
                        }
    
                        if (parseInt(pkt.IBV) < min_IBV || parseInt(pkt.IBV) > max_IBV) {
                            submit_rejected = true;
                            issues.push("Invalid IBV value");
                        }
                        if (parseInt(pkt.EBV) < min_EBV || parseInt(pkt.EBV) > max_EBV) {
                            submit_rejected = true;
                            issues.push("Invalid EBV value");
                        }
                        if (parseInt(pkt.IG) != 1) {
                            submit_rejected = true;
                            issues.push("IG value is -1 even after waiting for enough packets");
                        }
    
                        if (submit_rejected) {
                            toastr.error(`Submit Device ${imei} to reject bin`, {
                                timeOut: 10000
                            });
                        }
    
                    } else {
                        toastr.warning("OBD-message test was not selected, device seems STM/OBD, some tests {IG, EBV, IBV} not being carried", {
                            timeOut: 10000
                        });
                    }
                }
    
                if (issues.length > 0) return checkAbsecentFieldsAndIssues(pkt, submit_rejected);
    
                for (var key in vm.testing.tests[imei].all_test['gps']) {
                    if (vm.testing.tests[imei].all_test['gps'].hasOwnProperty(key)) {
                        vm.testing.tests[imei].all_test['gps'][key] = {
                            ...vm.testing.tests[imei].all_test['gps'][key],
                            status: 1,
                            status_text: "Passed",
                        };
                    }
                }
                $scope.obd_gps_errmsg = [];
                $scope.obd_gps_condition = pkt;
                $scope.obd_gps = true;
                vm.testing.tests[imei].test_cases['gps'].status = true;
                vm.testing.tests[imei].test_cases['gps'].message = pkt;
    
                // send rtc reset if gps and message test cases are passed
                // && vm.testing.tests[imei].test_cases['setting'].status != true
                // if(vm.testing.tests[imei].test_cases['gps'].status == true
                //     && vm.testing.tests[imei].test_cases['message'].status == true
                //     && vm.testing.tests[imei].test_cases['handshake'].status != true){
                //         vm.sendRTCReset(imei);
                //         return;
                //     }
            } else {
                return checkAbsecentFieldsAndIssues(pkt);
            }
        }
    
        function obdMessage(pkt, imei) {
            //obd message 
            // extra testing params for maxcube devices  && c[0].DE && c[0].TE && c[0].IBV && c[0].EBV && c[0].DC
            if (!vm.testing.tests[imei].test_cases['message']) {
                console.log("not subscribd to the test case of message, hence skipping");
                return;
            }
    
            if (pkt && pkt.hasOwnProperty("H") && pkt.H === 1)
                return;
    
            let issues = [];
    
            function checkAbsecentFieldsAndIssues(msg) {
                if (!(vm.testing.tests[imei].test_cases['message'].status === undefined)) return;
    
                vm.testing.tests[imei].test_cases['message'].message = msg;
                $scope.obd_message_condition = msg;
                $scope.obd_message_errmsg = [];
                //   vm.testing.tests[imei].test_cases['message'].message = pkt;
    
                $scope.obd_message_errmsg = $scope.obd_message_errmsg.concat(issues);
    
                // if (msg) {
                //     if (!msg.P)
                //         $scope.obd_message_errmsg.push("Packet not present");
                //     if (!msg.DS)
                //         $scope.obd_message_errmsg.push("Start Date (DS) not present");
                //     if (!msg.TS)
                //         $scope.obd_message_errmsg.push("Start Time (TS) not present");
                //     if (!msg.DE)
                //         $scope.obd_message_errmsg.push("End Date (DE) not present");
                //     if (!msg.TE)
                //         $scope.obd_message_errmsg.push("End time (TE) not present");
                //     if (!msg.DC)
                //         $scope.obd_message_errmsg.push("DC not present");
                // }
    
                vm.testing.tests[imei].test_cases['message'].errors = $scope.obd_message_errmsg;
            }
            if(pkt && pkt.hasOwnProperty("T") && pkt.hasOwnProperty("DC3")) {
                let properties = ['packet', 'de', 'te', 'dc', 'pt'];
                for(let i = 0; i < properties.length; i++) {
                    const elem = properties[i]
                    vm.testing.tests[imei].all_test['message'][elem] = {
                        ...vm.testing.tests[imei].all_test['message'][elem],
                        status: 1,
                        status_text: "Passed" 
                    }
                }
                
                if(vm.selectedProduct == 'OBD-MEV' && parseInt(pkt['PT']) < 32000) {
                    vm.testing.tests[imei].all_test['message']['pt'] = {
                        ...vm.testing.tests[imei].all_test['message']['pt'],
                        status: 1,
                        status_text: "Passed"
                    }
                } else {
                    vm.testing.tests[imei].all_test['message']['pt'] = {
                        ...vm.testing.tests[imei].all_test['message']['pt'],
                        status: 0,
                        status_text: "Pending"
                    }
                }
                if(pkt.hasOwnProperty("T") || pkt.hasOwnProperty("E") || pkt.hasOwnProperty("DC3")) {
                    if(pkt['T'] == 'O') {
                        vm.testing.tests[imei].all_test['message']['type'] = {
                            ...vm.testing.tests[imei].all_test['message']['type'],
                            status: 1,
                            status_text: "Passed"
                        }
                    }
                    if(pkt['E'] == 1) {
                        vm.testing.tests[imei].all_test['message']['e'] = {
                            ...vm.testing.tests[imei].all_test['message']['e'],
                            status: 1,
                            status_text: "Passed"
                        }
                    }
                    if(pkt['LMM'] == "1") {
                        vm.testing.tests[imei].all_test['message']['lmm'] = {
                            ...vm.testing.tests[imei].all_test['message']['lmm'],
                            status: 1,
                            status_text: "Passed"
                        }
                    }
                    if(pkt['DC3'] >= 1700 && pkt['DC3'] <= 2800) {
                        console.log(" lavdya dc3 1770")
                        vm.testing.tests[imei].all_test['message']['dc3'] = {
                            ...vm.testing.tests[imei].all_test['message']['dc3'],
                            status: 1,
                            status_text: "Passed"
                        }
                    } else if (pkt['DC3'] < 1700 || pkt['DC3'] > 2800) {
                        console.log(`DC3 value for ${vm.selectedProduct} should be between 1700 and 2800`)
                    }
                }
    
            }
    
            if (pkt && pkt.hasOwnProperty("P") &&
                pkt.hasOwnProperty("DE") && pkt.hasOwnProperty("TE")) {
    
                // let ds = pkt.DS;
                // let ts = pkt.TS;
                let properties = ['packet', 'de', 'te', 'dc'];
                for (let i = 0; i < properties.length; i++) {
                    const element = properties[i];
                    vm.testing.tests[imei].all_test['message'][element] = {
                        ...vm.testing.tests[imei].all_test['message'][element],
                        status: 1,
                        status_text: "Passed",
                    };
                }
    
                // additional sub test cases for max-cube
                if (vm.selectedProduct == "Max-Cube") {
                    let ibv_issues = [];
                    if (pkt.hasOwnProperty("IG") && pkt.hasOwnProperty("EBV") && pkt.hasOwnProperty("IBV")) {
                        let min_EBV = 3300;
                        let max_EBV = 4095;
                        let min_IBV = 3000;
                        let max_IBV = 4095;
                        if (
                            pkt.IG === 1 &&
                            pkt.EBV >= min_EBV && pkt.EBV <= max_EBV &&
                            pkt.IBV >= min_IBV && pkt.IBV <= max_IBV
                        ) {
                            console.log("no need to wait for more packets of GPS & OBD, test for {IG, EBV, IBV} already successful");
                        } else if (
                            vm.testing.tests[imei].buffer["message"].length <= 1 &&
                            vm.testing.tests[imei].buffer["gps"].length < 20
                        ) {
                            console.log("{IG, EBV, IBV} is coming in packet, waiting for enough time of 2 obd or 20 gps packets");
                            return;
                        }
    
                        if (parseInt(pkt.IBV) < min_IBV || parseInt(pkt.IBV) > max_IBV) ibv_issues.push("Invalid IBV value");
                        if (parseInt(pkt.EBV) < min_EBV || parseInt(pkt.EBV) > max_EBV) ibv_issues.push("Invalid EBV value");
                        if (parseInt(pkt.IG) != 1) ibv_issues.push("IG value is -1 even after waiting for enough packets");
                    }
                    else
                        ibv_issues.push('invalid ig/ebv/ibv packet');
    
                    issues.concat(ibv_issues);
                    if (ibv_issues.length == 0)
                        vm.testing.tests[imei].all_test['message']['ig/ebv/ibv'] = {
                            ...vm.testing.tests[imei].all_test['message']['ig/ebv/ibv'],
                            status: 1,
                            status_text: "Passed",
                        };
    
    
                    if (pkt.hasOwnProperty('XV')) {
                        if (pkt.hasOwnProperty('XV') && pkt['XV'].length > 0) {
                            let XV_length = pkt['XV'].length;
                            let to_match_string = `${pkt.XV[XV_length - 5]}${pkt.XV[XV_length - 4]}${pkt.XV[XV_length - 3]}${pkt.XV[XV_length - 2]}${pkt.XV[XV_length - 1]}`;
                            if ('10-00' == to_match_string)
                                vm.testing.tests[imei].all_test['message']['xv'] = {
                                    ...vm.testing.tests[imei].all_test['message']['xv'],
                                    status: 1,
                                    status_text: "Passed",
                                };
                            else
                                vm.testing.tests[imei].all_test['message']['xv'] = {
                                    ...vm.testing.tests[imei].all_test['message']['xv'],
                                    value: pkt['XV']
                                };
                        }
                        else {
                            vm.testing.tests[imei].all_test['message']['xv'] = {
                                ...vm.testing.tests[imei].all_test['message']['xv'],
                                value: pkt['XV']
                            };
                            issues.push('invalid xv packet');
                        }
                        if (pkt['P'] && pkt['P'].length >= 100)
                            vm.testing.tests[imei].all_test['message']['p-secondary'] = {
                                ...vm.testing.tests[imei].all_test['message']['p-secondary'],
                                status: 1,
                                status_text: "Passed",
                            };
                        else {
                            vm.testing.tests[imei].all_test['message']['p-secondary'] = {
                                ...vm.testing.tests[imei].all_test['message']['p-secondary'],
                                value: pkt['P']
                            };
                            issues.push('invalid secondary packet');
                        }
                    } else {
                        if (pkt['P'] && pkt['P'].length >= 500)
                            vm.testing.tests[imei].all_test['message']['p-primary'] = {
                                ...vm.testing.tests[imei].all_test['message']['p-primary'],
                                status: 1,
                                status_text: "Passed",
                            };
                        else {
                            vm.testing.tests[imei].all_test['message']['p-primary'] = {
                                ...vm.testing.tests[imei].all_test['message']['p-primary'],
                                value: pkt['P']
                            };
                            issues.push('invalid primary packet');
                        }
                    }
                }
    
                let de = pkt.DE;
                let te = pkt.TE;
                // this is to reset xcp counter if new obd message comes
                if (vm.testing.tests[imei].all_test['xcp'])
                    vm.testing.tests[imei].all_test['xcp']['xcp'].counter = 0;
                if (vm.testing.tests[imei].all_test['xcp'])
                    vm.testing.tests[imei].all_test['xcp']['xcp'].valid_gps_count = 0;
    
                // if (!validateDateTime(ds, ts)) {
                //     issues.push("Invalid Start Date Time in the live-packet");
                // }
    
                if (!validateDateTime(de, te)) {
                    issues.push("Invalid End Date Time in the live-packet");
                }
    
                if (pkt.hasOwnProperty("DC") && parseInt(pkt.DC) !== 1)
                    issues.push(`DC=${pkt.DC} coming from device`);
                else
                    vm.testing.tests[imei].all_test['message']['dc'] = {
                        ...vm.testing.tests[imei].all_test['message']['dc'],
                        status: 1,
                        status_text: "Passed"
                    };
                vm.testing.tests[imei].buffer["message"].push(pkt);
    
                if (issues.length > 0) return checkAbsecentFieldsAndIssues(pkt);
                $scope.obd_message_condition = pkt;
                $scope.obd_message = true;
                // check if all sub test are passed
                let finalSubTestCaseStatus = checkStatusForSubTestCases(vm.testing.tests[imei].all_test['message']);
                if (!finalSubTestCaseStatus)
                    return;
                vm.testing.tests[imei].test_cases['message'].status = true;
                vm.testing.tests[imei].test_cases['message'].message = pkt;
                $scope.obd_message_errmsg = [];
            } else {
                return checkAbsecentFieldsAndIssues(pkt);
            }
        }
    
        // check if all sub test are passed
        function checkStatusForSubTestCases(subTestCases) {
            let status = true;
            for (const key in subTestCases) {
                if (subTestCases.hasOwnProperty(key)) {
                    if (subTestCases[key].status != 1) {
                        status = false;
                        break;
                    }
                }
            }
            return status;
        }
    
        function testSettings(msg, imei) {
            // settings check though is similar for obd & vts it is kept separate to have independent controll
            if (!vm.testing.tests[imei].test_cases['setting']) {
                console.log(`settings packet for ${imei} received, test is not subscribed, so ignored`);
                return;
            }
            if (Array.isArray(msg)) {
                for (let i = 0; i < msg.length; i++) {
                    let done = validate(msg[i]);
                    if (done) break;
                }
            } else {
                validate(msg);
            }
    
            function validate(d) {
                //setting 
                if (d.set) {
                    $scope.dev_setting = true;
                    $scope.dev_setting_condition = d;
                    $scope.dev_setting_errmsg = [];
                    vm.testing.tests[imei].test_cases['setting'].status = true;
                    vm.testing.tests[imei].test_cases['setting'].message = d;
                    for (var key in vm.testing.tests[imei].all_test['setting']) {
                        if (vm.testing.tests[imei].all_test['setting'].hasOwnProperty(key)) {
                            vm.testing.tests[imei].all_test['setting'][key] = {
                                ...vm.testing.tests[imei].all_test['setting'][key],
                                status: 1,
                                status_text: "Passed",
                            };
                        }
                    }
                    return true;
                } else if (vm.testing.tests[imei].test_cases['setting'].status === undefined) {
                    $scope.dev_setting_condition = d;
                    $scope.dev_setting_errmsg = [];
                    vm.testing.tests[imei].test_cases['setting'].message = d;
                    if (!d.set) {
                        $scope.dev_setting_errmsg.push("Setting not present");
                    }
    
                    vm.testing.tests[imei].test_cases['setting'].errors = $scope.dev_setting_errmsg;
                    return false;
                }
            }
        }
    
        /**
         * 
         * @param {Object} b - it will always be object
         * @param {String} imei - IMEI of the device being tested
         */
        function vtsGps(pkt, imei) {
            //gps 
    
            if (!vm.testing.tests[imei].test_cases['gps']) {
                console.log("not subscribd to the test case of gps, hence skipping");
                return;
            }
    
            if (pkt.hasOwnProperty("H") && parseInt(pkt.H) === 1) {
                return;
            }
    
            let issues = [];
            if (vm.checkTestStatus(imei) == true) {
                vm.testing.tests[imei].status = 1;
                vm.setTestResult(imei);
            }
    
            function checkAbsecentFieldsAndIssues(pkt) {
                if (!(vm.testing.tests[imei].test_cases['gps'].status === undefined)) return;
                vm.testing.tests[imei].test_cases['gps'].message = pkt;
                $scope.vts_gps_condition = pkt;
                $scope.vts_gps_errmsg = [];
                if (pkt) {
                    $scope.vts_gps_errmsg = $scope.vts_gps_errmsg.concat(issues);
                    if (!pkt.F)
                        $scope.vts_gps_errmsg.push("Fix Not Present");
    
                    vm.testing.tests[imei].test_cases["gps"].errors = $scope.vts_gps_errmsg;
                }
            }
            if (pkt && pkt.F === 3) {
    
                // validation of date time
                let dstr = pkt.GD;
                let tstr = pkt.GT;
    
                if (!validateDateTime(dstr, tstr)) {
                    issues.push("Invalid Date Time in the live-packet");
                }
    
                if (issues.length > 0) return checkAbsecentFieldsAndIssues(pkt);
    
                $scope.vts_gps = true;
                $scope.vts_gps_condition = pkt;
                $scope.vts_gps_errmsg = [];
                vm.testing.tests[imei].test_cases["gps"].status = true;
                vm.testing.tests[imei].test_cases["gps"].message = pkt;
            } else {
                checkAbsecentFieldsAndIssues(pkt);
            }
        }
    
        function vtsHandshake(a, imei) {
            //obd handshake
            if (!vm.testing.tests[imei].test_cases['handshake']) {
                console.log("not subscribd to the test case of handshake, hence skipping");
                return;
            }
            if (a && a.TV) {
                $scope.vts_handshake = true;
                $scope.vts_handshake_condition = a;
                $scope.vts_handshake_errmsg = [];
                vm.testing.tests[imei].test_cases["handshake"].status = true;
                vm.testing.tests[imei].test_cases["handshake"].message = a;
            } else if ($scope.vts_handshake === undefined) {
                $scope.vts_handshake_condition = a;
                $scope.vts_handshake_errmsg = [];
    
                if (!a.VIN)
                    $scope.vts_handshake_errmsg.push("VIN not present");
                if (!a.OP)
                    $scope.vts_handshake_errmsg.push("Protocol not present");
    
                vm.testing.tests[imei].test_cases["handshake"].errors = $scope.vts_handshake_errmsg;
    
            }
        }
    
        function zeroValueCheck(pkt) {
            //fuel dc value zero(0) check 
            if (pkt && pkt.DC === 0) {
                $scope.zero_value = true;
                $scope.zero_value_condition = pkt;
                $scope.zero_value_errmsg = [];
            } else if ($scope.zero_value === undefined) {
                $scope.zero_value_condition = pkt;
                $scope.zero_value_errmsg = [];
                $scope.zero_value_errmsg.push("DC value Zero(0) not present");
            }
        }
    
        function oneValueCheck(pkt) {
            //fuel- dc value one(1) check 
            if (pkt && pkt.DC === 1) {
                $scope.one_value = true;
                $scope.one_value_condition = pkt;
                $scope.one_value_errmsg = [];
            } else if ($scope.one_value === undefined) {
                $scope.one_value_condition = pkt;
                $scope.one_value_errmsg = [];
                $scope.one_value_errmsg.push("DC value One(1) not present");
            }
        }
    
        function vtsAndFuelMessage(pkt) {
            if (pkt.SV > 100) {
                $scope.vts_message = true;
                $scope.vts_message_condition = pkt;
                $scope.vts_message_errmsg = [];
            } else if ($scope.vts_message === undefined) {
                $scope.vts_message_condition = pkt;
                $scope.vts_message_errmsg = [];
                if (pkt) {
                    if (!pkt.P)
                        $scope.vts_message_errmsg.push("Packet not present");
                    if (!pkt.DS)
                        $scope.vts_message_errmsg.push("DateStamp not present");
                    if (!pkt.TS)
                        $scope.vts_message_errmsg.push("TimeStamp not present");
                }
            }
        }
    
        $scope.increaseCounter = function (e) {
            if (e)
                $scope.se = true;
            else
                $scope.se = false;
            $scope.start_time = new Date().getTime();
            //console.log($scope.start_time);
            $scope.counter = 0;
            timer();
        }
    
        $scope.$watch('counter', function (newValue, oldValue) {
            if ($scope.counter > 900) {
                $interval.cancel(promise);
                $scope.failed = 'Test Failed';
                $scope.end_time = new Date().getTime();
            }
            if ($scope.obd_handshake && $scope.obd_gps && $scope.obd_message && $scope.dev_setting) {
                $scope.passed = 'Test Passed';
                $interval.cancel(promise);
                $scope.end_time = new Date().getTime();
            }
    
            if ($scope.vts_handshake && $scope.vts_gps && $scope.vts_message && $scope.vts_setting && $scope.zero_value && $scope.one_value) {
                $scope.passed = 'Test Passed';
                $interval.cancel(promise);
                $scope.end_time = new Date().getTime();
            }
        });
    
        function timer() {
            $scope.counter = $scope.counter + 1;
        }
    
        promise = $interval(timer, 1000);
        // $scope.testmode = true;
        // $scope.mode == "'obd'";
    
        $scope.start_test = function () {
            for (var i = 0; i < log_data_fuel.length; i++) {
                testMode(log_data_fuel[i]);
            }
        };
    
        $scope.logout = function () {
            localStorage.clear();
            $location.path("login");
            $state.go("login");
        };
    
        vm.specsLoaded = true;
        vm.pnumSpec = 1;
        vm.pagesizeSpec = 200;
        vm.getAllGensetSpecification = function (pnum) {
            vm.specsLoaded = false;
            vm.selectedSpecification1 = {};
            var url = `${BASEURL}genset/specs/list?&token=${vm.token}`;
            var options = {};
            if (vm.spec_query) options.spec_query = vm.spec_query;
            if (vm.pagesizeSpec) options.psize = vm.pagesizeSpec;
            if (vm.pnumSpec) options.pnum = vm.pnumSpec;
            if (pnum) {
                vm.pnumSpec = pnum;
                options.pnum = vm.pnumSpec;
            }
            if (options && options.spec_query)
                url += "&spec_name=" + options.spec_query;
            if (options && options.pnum) url += "&pnum=" + options.pnum;
            if (options && options.psize) url += "&psize=" + options.psize;
            get(url).then(function (data) {
                response = data.data;
                vm.specsLoaded = true;
                console.log("getAllGensetSpecification", response);
                if (
                    response &&
                    response.status &&
                    response.status.code &&
                    response.status.code == "200"
                ) {
                    vm.gensetSpecifications = response;
                }
            });
        };
    
        vm.getIdevices = function (pnum, query) {
            if (!pnum) pnum = "";
            if (!query) query = "";
            vm.devicesLoaded = false;
            var url =
                BASEURL +
                "idevice/listV2?showall=true&psize=6" +
                "&query=" +
                query +
                "&pnum=" +
                pnum +
                "&token=" +
                vm.token +
                "&acc_id=" +
                vm.user.accountId;
            get(url).then(function (res) {
                data = res.data;
                vm.devices = data;
                vm.devicesLoaded = true;
            });
        };
    
        function mapSpecObjectToGenset() {
            if (
                vm.gensetListing &&
                vm.gensetListing.list &&
                vm.gensetListing.list.length &&
                vm.gensetSpecifications &&
                vm.gensetSpecifications.result &&
                vm.gensetSpecifications.result.length
            ) {
                for (var i = 0; i < vm.gensetListing.list.length; i++) {
                    current_gen = vm.gensetListing.list[i];
                    if (current_gen && current_gen.spec_id)
                        current_gen.specInfo = _.find(vm.gensetSpecifications.result, {
                            id: current_gen.spec_id,
                        });
                }
            }
        }
    
        vm.searhGensetQuery = "";
        vm.loaderForGensetListing = false;
        vm.manageGensetPnum = 1;
        vm.manageGensetPsize = 200;
    
        vm.getGensetListing = function (pnum, query, acc_id) {
            if (!pnum) vm.manageGensetPnum = 1;
            else vm.manageGensetPnum = pnum;
            if (query) vm.searhGensetQuery = query;
            else vm.searhGensetQuery = "";
            vm.loaderForGensetListing = true;
            let accountId = vm.currentAccount.id;
            var url = `${BASEURL}genset/byaccount/${accountId}?query=${vm.searhGensetQuery}&pnum=${vm.manageGensetPnum}&psize=20&token=${vm.token}&acc_id=${vm.user.accountId}`;
            get(url).then(function (res) {
                console.log(res.data);
                if (res && res.data) {
                    vm.gensetListing = res.data;
                    $timeout(function () {
                        mapSpecObjectToGenset();
                    }, 1500);
                }
                vm.loaderForGensetListing = false;
            });
        };
    
        vm.cancelDetachPopUpGenset = function () {
            vm.genset = {};
            $("#confirmDeleteGensetModal").modal("hide");
        };
    
        vm.detachFromGenset = function () {
            var obj = {
                gensetId: vm.genset.id,
                ideviceId: vm.genset.idevice_id,
            };
            // toastr.info("Attaching");
            var url = `${BASEURL}genset/${vm.genset.id}/detachidevice/${vm.genset.idevice_id}?&token=${vm.token}&acc_id=${vm.user.accountId}`;
            post(url, obj).then(function (data) {
                response = data.data;
                // if (response.status && response.status == '200') {
                toastr.info("Device detached");
                vm.cancelDetachPopUpGenset();
                vm.getGensetListing();
                // }
                // else {
                //     toastr.error("Failed to detached");
                // }
            });
        };
    
        vm.getSuggestedGensets = function () {
            if (!vm.genset || !vm.genset.tag || !vm.genset.tag.trim()) {
                vm.suggestedGensets = null;
                return;
            }
            var url =
                BASEURL +
                "genset/byaccount/" +
                vm.currentAccount.id +
                "?query=" +
                vm.genset.tag +
                "&pnum=1" +
                "&psize= 10" +
                "&token=" +
                vm.token;
    
            return get(url).then(function (obj) {
                console.log(obj);
                if (
                    !obj &&
                    !obj.data &&
                    !obj.data.status &&
                    obj.data.status.code != 200
                )
                    return;
                if (obj && obj.data && obj.data.list) {
                    vm.suggestedGensets = obj.data.list;
                }
            });
        };
    
        vm.attachImei = function (info) {
            if (!info) {
                info = {
                    idevice_id: $scope.selectedGensetId,
                    id: vm.genset.id,
                };
            }
            var url = `${BASEURL}genset/${info.id}/attachidevice/${info.idevice_id}?&token=${vm.token}&acc_id=${vm.user.accountId}`;
            var obj = {
                gensetId: vm.genset.id,
                ideviceId: vm.genset.idevice_id,
            };
            post(url, obj).then(function (response) {
                if (response.data && response.data[0] && response.data[0].idevice_id) {
                    vm.getGensetListing();
                    vm.cancel();
                    toastr.info("Device attached");
                } else {
                    toastr.error("Failed to attach");
                }
            });
        };
    
        vm.saveGenset = function () {
            var url = `${BASEURL}genset/create?token=${vm.token}`;
            if (vm.genset && vm.genset.id) {
                var url = `${BASEURL}genset/${vm.genset.id}/update?token=${vm.token}`;
                vm.genset.gensetId = vm.genset.id;
            }
            vm.genset.engine_no = vm.genset.tag;
            vm.loaderForGenset = true;
            post(url, vm.genset).then(function (obj) {
                if (!obj && !obj.data && !obj.data.id) {
                    toastr.error();
                    return;
                } else {
                    toastr.info("genset updated");
                    vm.loaderForGenset = false;
                    if (vm.genset && vm.genset.imeiInfo && !vm.genset.gensetId) {
                        var requestObj = {
                            id: obj.data.id,
                            idevice_id: vm.genset.imeiInfo.id,
                        };
                        vm.attachImei(requestObj);
                    }
                    $timeout(function () {
                        vm.genset = {};
                        $("#addGensetModal").modal("hide");
                        vm.getGensetListing();
                    }, 2000);
                }
            });
        };
    
        vm.toggle = function (page) {
            if (page == 'account') {
                vm.setCurrentAccount = undefined;
                vm.accountView = true;
            } else {
                let isGensetAccount = vm.currentAccount?.config?.ui?.pages?.includes('genset_data');
                if (isGensetAccount) {
                    vm.accountView = false;
                    vm.vehicleView = false;
                    vm.gensetView = true;
                    vm.getGensetListing();
                    vm.getAllGensetSpecification();
                    vm.getIdevices();
                }
                else {
                    vm.accountView = false;
                    vm.vehicleView = true;
                    vm.gensetView = false;
                    vm.getVehicles(1);
                    // vm.getAllSpecifications();
                }
            }
        };
    
        $scope.devicesLoaded = false;
        $scope.pageLoading = false;
        $scope.devices = null;
        $scope.pagesize = "5";
        update(1);
        $scope.selectedId = undefined;
        $scope.selectedDevice = undefined;
        $scope.query = undefined;
        $scope.next = function () {
            if (($scope.devices.paging.pnum) == $scope.devices.paging.pages)
                return;
            update($scope.devices.paging.pnum + 1);
        };
        $scope.prev = function () {
            if (0 == $scope.devices.paging.pages)
                return;
            update($scope.devices.paging.pnum - 1);
        };
        $scope.pageSizeChange = function () {
    
            update(1);
        }
    
        $scope.getPageTimes = function () {
            var cnt = 0;
            if ($scope.devices && $scope.devices.paging)
                cnt = $scope.devices.paging.pages;
            var arr = new Array(cnt);
    
            //    arr[vm.vehicles.paging.pnum].active = true;
    
            return arr;
        }
    
        $scope.go = function (pnum) {
            update(pnum);
        }
        $scope.selectDevice = function (idevice) {
            if ($scope.selectedId === idevice.id) {
                $scope.selectedId = undefined;
                $scope.selectedDevice = undefined;
            } else {
                $scope.selectedId = idevice.id;
                $scope.selectedDevice = idevice;
            }
        }
        $scope.isActivePage = function (index) {
            return $scope.devices && $scope.devices.paging && $scope.devices.paging.pnum == (index + 1);
        }
    
        function update(pnum) {
            $scope.selectedId = undefined;
            $scope.devices = undefined;
            $scope.selectedDevice = undefined;
            if (!pnum)
                pnum = 1;
            var sorting = [{
                property: '__utclastupdateddate',
                isasc: false
            }];
            $scope.pageLoading = true;
            $scope.devicesLoaded = false;
            var url = BASEURL + "idevice/listV2?psize=6" + "&pnum=" + pnum + "&token=" + vm.token;
            if ($scope.query)
                url += "&query=" + $scope.query;
            // pnum, $scope.pagesize,$scope.query,null,true
            get(url).then(function (data) {
                $scope.devices = data.data;
                $scope.devicesLoaded = true;
                $scope.pageLoading = false;
            });
        }
        update();
    
        $scope.attachSelectedDevice = function () {
            // toastr.info("Attaching");
            // console.log("Vehicle for attach",vm.selectedVehicleForAttach);
            // console.log("IMEI for attach",$scope.selectedDevice);
            if ($scope.selectedId) {
                var url = BASEURL + "vehicle/{vehicleid}/attachideviceV2/{ideviceid}?";
                url = url.replace("{vehicleid}", $scope.vm.selectedVehicleForAttach)
                    .replace("{ideviceid}", $scope.selectedDevice.id);
                url += "&token=" + vm.token;
                post(url).then(function (res) {
                    var obj = res.data;
                    if (obj.status.code === '200' || obj.status.code === 200) {
                        toastr.info("IMEI Attached to Vehicle");
                        vm.getVehicles(1);
                        $("#ideviceModal").modal("hide");
                    } else if (obj.status && obj.status.err) {
                        toastr.error(obj.status.err);
                    } else {
                        toastr.error("IMEI not attached to Vehicle");
                    }
                });
            }
        };
    
    
        vm.detachFromVehicle = function (ideviceId, vehicleId, index) {
            // toastr.info("Detaching...");
            var url = BASEURL + "vehicle/{vehicleid}/detachideviceV2/{ideviceid}?";
            url = url.replace("{vehicleid}", $scope.vehicleId)
                .replace("{ideviceid}", $scope.ideviceId)
            url += "&token=" + vm.token;
            post(url).then(function (res) {
                var obj = res.data;
                if (obj.status.code == 200) {
                    toastr.info("IMEI De-attached to Vehicle");
                    vm.getVehicles(1);
                    $("#ideviceModal").modal("hide");
                    $("#confirmDeleteModal").modal("hide");
                } else {
                    toastr.error("IMEI not attached to Vehicle");
                }
            });
        };
    
        vm.confirmdetachFromVehicle = function (ideviceId, vehicleId, index) {
            $scope.ideviceId = ideviceId;
            $scope.vehicleId = vehicleId;
            $scope.index = index;
        };
    
        vm.cancelDetachPopUp = function () {
            $scope.ideviceId = undefined;
            vm.selectedVehicleForAttach = undefined;
            $scope.vehicleId = undefined;
            $scope.index = undefined;
            $("#confirmDeleteModal").modal("hide");
        };
    
        vm.cancelAttachPopUp = function () {
            $("#ideviceModal").modal("hide");
        };
    
        $scope.save = function () {
            $("#ideviceModal").modal("hide");
        };
    
        function getTheUser(appconfig) {
            var user = localStorage.getItem("User");
            if (typeof user != 'string') {
    
                return null;
            }
            var token = localStorage.getItem("UserToken");
            if (!token) {
                return null;
            }
            return get(BASEURL + 'v2/user/getbytoken/' + token);
        }
    
        var replaceUnderScore = function (value) {
            if (!value) {
                return;
            }
            return value.replace(/_/g, ' ');
        }
        var capitalize = function (value, lower) {
            if (!value)
                return;
            else
                return (lower ? value.toLowerCase() : value).replace(/(?:^|\s)\S/g, function (a) {
                    return a.toUpperCase();
                });
        };
    
        $scope.getShowableString = function (value) {
            var str = replaceUnderScore(value);
            return capitalize(str, true);
        }
    
        $scope.collapsibleInit = function () {
    
            var coll = document.getElementsByClassName("collapsible");
    
            for (let i = 0; i < coll.length; i++) {
                coll[i].addEventListener("click", function () {
                    this.classList.toggle("collapsible-active");
                    let content = this.nextElementSibling;
                    if (content.style.maxHeight) {
                        content.style.maxHeight = null;
                    } else {
                        content.style.maxHeight = content.scrollHeight + "px";
                    }
                });
            }
        }
    
        //#region testing section
    
        vm.setMarkOption = function (option) {
            _.map(vm.testCases, function (o) {
                o.checked = option;
            });
        };
    
        // vm.selectedimeiAssembly = {"stn":false,"for_deployment":false,"tags":["3g"],"id":"505418808668852224","imei":"359377060176384","tag":"sieera - 359377060176384","isenabled":true,"communication_protocol":"AUTO, ISO 15765-4","protocol":"AUTO, ISO 15765-4","gpsenabled":true,"type":"obd","inmotion":false,"status":"SLEEP","tracker_type":"lo","is_test_device":false,"tv":"7.1","ov":"7.0.1IC2","account_id":"99784999389233785","vid":"118832281635914242","sims":{"normal":{"id":"530160269523959808","number":"89912215500006465082"}},"manufacturing_batch":"3G 1.1.00 2018 August 1","manufacturing_batch_id":"688043053855801344","subscription_years":3,"device_version_id":"691255365215481856","device_version":"3G 1.1.00","__lastupdatetime":1578638109934,"__lastcreatedtime":1528369399972,"availability_status_reason":"ready_for_deployment","is_available":true,"assigned_to":null,"additional_info":null,"manual_tags":null,"assembly":{"CL1":{},"CL2":{},"AS1":{},"AS2":{},"TST":{},"OQC":{},"STK":{}}};
    
        vm.setIdeviceForAssembly = function (imei) {
            getIdeviceInfo(vm.selectedimeiAssembly);
            getIdeviceAssemblyReport(vm.selectedimeiAssembly);
        };
    
        // vm.setIdeviceForAssembly();
    
        vm.updateSubscriptionYear = function (year) {
            if (!year) {
                toastr.error("please add subscription year");
                return;
            }
            var url = `${BASEURL}idevice/${vm.selectedimeiAssembly.id}/updateV2?token=${vm.token}`;
            var body = {
                "subscription_years": year
            };
            post(url, body).then(function (response) {
                var info = response.data;
                if (info.status && info.status.code == 200) {
                    getIdeviceAssemblyReport(vm.selectedimeiAssembly);
                    toastr.info("Subscription updated");
                }
            });
        };
    
        vm.compareValues = async function (value) {
    
            if (value == 'AS1') {
                ic_imei = document.getElementById('ic_imei').value;
                t_imei = document.getElementById('t_imei').value;
                console.log(value);
                if (ic_imei.length == 0 | t_imei.length == 0) {
                    toastr.error("Please scan valid imei");
                    return;
                }
                if (ic_imei == t_imei) {
                    vm.updateAssemblyStatus(value, 'success', value);
                } else {
                    toastr.error("Please scan valid imei");
                    return;
                }
            }
            if (value == 'AS2') {
                t_imei_as2 = document.getElementById('t_imei_as2').value;
                b_imei_as2 = document.getElementById('b_imei_as2').value;
                console.log(value);
                if (t_imei_as2.length == 0 | b_imei_as2.length == 0) {
                    toastr.error("Please scan valid imei");
                    return;
                }
                if (t_imei_as2 == b_imei_as2) {
                    vm.updateAssemblyStatus(value, 'success', value);
                } else {
                    toastr.error("Please scan valid imei");
                    return;
                }
            }
    
            if (value == 'STK') {
                t_imei_stk = document.getElementById('t_imei_stk').value;
                b_imei_stk = document.getElementById('b_imei_stk').value;
                console.log(value);
                if (t_imei_stk.length == 0 | b_imei_stk.length == 0) {
                    toastr.error("Please scan valid imei");
                    return;
                }
                if (t_imei_stk == b_imei_stk) {
                    vm.updateAssemblyStatus(value, 'success', value);
                } else {
                    toastr.error("Please scan valid imei");
                    return;
                }
            }
    
            if (value === "PKG") {
                let pkg_imei = document.getElementById('pkg_imei').value;
                let carton_id = document.getElementById('carton_qr').value;
    
                if (vm.imeiInfo.imei !== pkg_imei) {
                    toastr.error("IMEI being submitted is wrong");
                    return;
                }
                if (!Boolean(carton_id)) {
                    toastr.error("Scan Carton QR first");
                    return;
                }
    
    
                vm.carton.updating = true;
                try {
                    await vm.addDeviceToCarton(carton_id, pkg_imei);
                } catch (error) {
                    toastr.error(`Error occured while adding device`);
                } finally {
                    vm.carton.updating = false;
                }
    
            }
    
        };
    
        function getIdeviceInfo(imeiInfo) {
            vm.imeiInfo = null;
    
            vm.carton.updating = false;
            vm.is_foqc = false;
            vm.sticker.available = false;
            var url = BASEURL + "idevice/" + imeiInfo.id + "/getinfoV2?assembly=true&token=" + vm.token;
            get(url).then(function (res) {
                console.log('getIdeviceInfo', res.data);
                vm.showAS1 = false;
                if (res.data && res.data.result && res.data.result.idevice && !res.data.result.idevice.assembly) {
                    // resetAssembly(imeiInfo);
    
                } else if (res.data && res.data.result && res.data.result.idevice && res.data.result.idevice.assembly) {
                    vm.is_foqc = false;
                    vm.imeiInfo = imeiInfo;
    
                    var currentAssembly = res.data.result.idevice.assembly;
    
                    if (imeiInfo.assembly_freez === true) {
                        vm.resetAssemblyDisabled = true;
                    } else {
                        vm.resetAssemblyDisabled = false;
                    }
    
                    if (imeiInfo.is_available === true) {
                        vm.selectedimeiAssembly.availability = "Available";
                    } else if (imeiInfo.is_available === false) {
                        vm.selectedimeiAssembly.availability = "NOT Available";
                    }
    
                    vm.selectedimeiAssembly.availability_reason = imeiInfo.availability_status_reason;
    
                    if (currentAssembly && currentAssembly['OQC'])
                        delete currentAssembly['OQC'];
                    vm.currentAssemblyStage = {};
    
                    vm.currentAssemblyStage['CL1'] = currentAssembly['CL1']
                    vm.currentAssemblyStage['CL1'] ? null : vm.currentAssemblyStage['CL1'] = {};
                    if (!vm.currentAssemblyStage['CL1'].status || vm.currentAssemblyStage['CL1'].status != 'success') {
                        vm.currentAssemblyStage['CL1'].isDisabled = false;
                        vm.currentAssemblyStage['CL1'].force_status_update = currentAssembly.force_status_update;
                    } else {
                        vm.currentAssemblyStage['CL1'].force_status_update = currentAssembly.force_status_update;
                    }
    
                    vm.currentAssemblyStage['CL2'] = currentAssembly['CL2'];
                    vm.currentAssemblyStage['CL2'] ? null : vm.currentAssemblyStage['CL2'] = {};
                    if (!vm.currentAssemblyStage['CL2'].status || vm.currentAssemblyStage['CL2'].status != 'success') {
                        if (vm.currentAssemblyStage['CL1'].status == 'success') {
                            vm.currentAssemblyStage['CL2'].isDisabled = false;
                            vm.currentAssemblyStage['CL2'].force_status_update = currentAssembly.force_status_update;
                        } else {
                            vm.currentAssemblyStage['CL2'].force_status_update = currentAssembly.force_status_update;
                            if (vm.currentAssemblyStage['CL2'].force_status_update == true)
                                vm.currentAssemblyStage['CL2'].isDisabled = false;
                            else
                                vm.currentAssemblyStage['CL2'].isDisabled = true;
                        }
                    }
    
                    vm.currentAssemblyStage['AS1'] = currentAssembly['AS1'];
                    vm.currentAssemblyStage['AS1'] ? null : vm.currentAssemblyStage['AS1'] = {};
                    if (!vm.currentAssemblyStage['AS1'] || !vm.currentAssemblyStage['AS1'].status || vm.currentAssemblyStage['AS1'].status != 'success') {
                        if (vm.currentAssemblyStage['CL2'].status == 'success') {
                            vm.currentAssemblyStage['AS1'].isDisabled = false;
                            vm.currentAssemblyStage['AS1'].force_status_update = currentAssembly.force_status_update;
                            vm.showAS1 = true;
                            generateStickerForAS1(imeiInfo.imei, 'as1_sticker_ic', 'as1_sticker_top', imeiInfo.device_version);
                            vm.generateImeiStickerImg();
                        } else {
                            vm.currentAssemblyStage['AS1'].force_status_update = currentAssembly.force_status_update;
                            if (vm.currentAssemblyStage['AS1'].force_status_update == true)
                                vm.currentAssemblyStage['AS1'].isDisabled = false;
                            else
                                vm.currentAssemblyStage['AS1'].isDisabled = true;
                        }
                    }
    
                    vm.currentAssemblyStage['AS2'] = currentAssembly['AS2'];
                    vm.currentAssemblyStage['AS2'] ? null : vm.currentAssemblyStage['AS2'] = {};
                    if (!vm.currentAssemblyStage['AS2'] || !vm.currentAssemblyStage['AS2'].status || vm.currentAssemblyStage['AS2'].status != 'success') {
                        if (vm.currentAssemblyStage['AS1'].status == 'success') {
                            vm.currentAssemblyStage['AS2'].isDisabled = false;
                            vm.showAS1 = true;
                            vm.currentAssemblyStage['AS2'].force_status_update = currentAssembly.force_status_update;
                            generateStickerForAS1(imeiInfo.imei, 'as1_sticker_ic', 'as1_sticker_top', imeiInfo.device_version);
                            vm.generateImeiStickerImg();
                        } else {
                            vm.currentAssemblyStage['AS2'].force_status_update = currentAssembly.force_status_update;
                            if (vm.currentAssemblyStage['AS2'].force_status_update == true)
                                vm.currentAssemblyStage['AS2'].isDisabled = false;
                            else
                                vm.currentAssemblyStage['AS2'].isDisabled = true;
                        }
                    }
    
                    vm.currentAssemblyStage['TST'] = currentAssembly['TST'];
                    vm.currentAssemblyStage['TST'] ? null : vm.currentAssemblyStage['TST'] = {};
                    if (!vm.currentAssemblyStage['TST'].status || vm.currentAssemblyStage['TST'].status != 'success') {
                        if (vm.currentAssemblyStage['AS2'].status == 'success') {
                            vm.currentAssemblyStage['TST'].isDisabled = false;
                        } else {
                            if (vm.currentAssemblyStage['TST'].force_status_update == true)
                                vm.currentAssemblyStage['TST'].isDisabled = false;
                            else
                                vm.currentAssemblyStage['TST'].isDisabled = true;
                        }
                    }
    
                    vm.currentAssemblyStage['STK'] = currentAssembly['STK'];
                    vm.currentAssemblyStage['STK'] ? null : vm.currentAssemblyStage['STK'] = {};
                    if (!vm.currentAssemblyStage['STK'].status || vm.currentAssemblyStage['STK'].status != 'success') {
                        if (vm.currentAssemblyStage['TST'].status == 'success') {
                            vm.currentAssemblyStage['STK'].force_status_update = currentAssembly.force_status_update;
                            vm.currentAssemblyStage['STK'].isDisabled = false;
                        } else {
                            vm.currentAssemblyStage['STK'].force_status_update = currentAssembly.force_status_update;
                            if (vm.currentAssemblyStage['STK'].force_status_update == true)
                                vm.currentAssemblyStage['STK'].isDisabled = false;
                            else
                                vm.currentAssemblyStage['STK'].isDisabled = true;
                        }
                    }
    
                    vm.currentAssemblyStage['PKG'] = currentAssembly['PKG'];
                    vm.currentAssemblyStage['PKG'] ? null : vm.currentAssemblyStage['PKG'] = {};
                    if (!vm.currentAssemblyStage['PKG'] || !vm.currentAssemblyStage['PKG'].status || vm.currentAssemblyStage['PKG'].status != 'success') {
                        if (vm.currentAssemblyStage['PKG'] == undefined)
                            vm.currentAssemblyStage['PKG'] = {};
                        if (vm.currentAssemblyStage['STK'] && vm.currentAssemblyStage['STK'].status == 'success') {
                            vm.currentAssemblyStage['PKG'].force_status_update = currentAssembly.force_status_update;
                            vm.currentAssemblyStage['PKG'].isDisabled = false;
                            vm.is_foqc = true;
                            vm.listDeviceCartons();
                        } else {
                            if (!vm.currentAssemblyStage['PKG'])
                                vm.currentAssemblyStage['PKG'] = {};
                            vm.currentAssemblyStage['PKG'].force_status_update = !currentAssembly.force_status_update;
                            if (vm.currentAssemblyStage['PKG'].force_status_update == true)
                                vm.currentAssemblyStage['PKG'].isDisabled = false;
                            else
                                vm.currentAssemblyStage['PKG'].isDisabled = true;
                        }
                    } else if (vm.currentAssemblyStage['PKG'].status != 'success') {
                        vm.show_carton_list = true;
                    }
                    console.log('currentAssemblyStage', vm.currentAssemblyStage);
                }
            });
        }
    
        vm.getIdeviceInfo = getIdeviceInfo;
    
        function resetAssembly(imeiInfo, popUp) {
            // return;
            var url = BASEURL + "idevice/" + imeiInfo.imei + "/assembly/reset?token=" + vm.token;
            var obj = {
                "imei": imeiInfo.imei
            };
            post(url, obj).then(function (res) {
                console.log('reset assembly', res.data);
                if (res.data && res.data.status && res.data.status.code == 200) {
                    getIdeviceInfo(imeiInfo);
                    if (popUp)
                        $("#resetAssemblyModal").modal("hide");
                }
            });
        }
        vm.resetAssembly = resetAssembly;
    
        vm.submitStageReport = function (stage, status) {
            /* status
                    0 - failed
                    1 - success
            */
            console.log('stage', stage);
            console.log('status', status);
            vm.updateAssemblyStatus();
        };
    
        var MQTT_BASEURL_TESTING = "mqtt://device.intangles.com:1883";
        var clientForTestingID = "ui-reader" + parseInt(Math.random() * 100, 10);
        var clientForTesting = mqtt.connect(MQTT_BASEURL_TESTING, {
            clientId: clientForTestingID
        });
    
        vm.startTest = function (imei) {
            if (imei) {
                $scope.messageArray = [];
                vm.testing.imeis.push(imei);
                vm.imeiLogs[imei] = [];
    
                clientForTesting.subscribe('uimsg-' + imei);
                clientForTesting.on('message', onMessageTest);
                let tests = {};
                let buffer = {};
                var test = _.map(_.filter(vm.testCases, {
                    checked: true
                }), 'value');
                let all_test = {};
                for (let i = 0; i < test.length; i++) {
                    tests[test[i]] = {
                        status: undefined
                    };
                    buffer[test[i]] = [];
                    all_test[test[i]] = getSubtestCases(test[i]);
                }
                vm.testing.tests[imei] = {
                    test_cases: tests,
                    status: 2,
                    start_time: '',
                    device_status: '',
                    buffer: buffer,
                    all_test: all_test
                };
                checkDeviceStatus(imei);
                $scope.sendDeviceReset(imei);
                console.log(vm.testing);
            }
        };
    
        $scope.initializeSubTestCases = function () {
            $scope.initialGpsSubTestCases = {
                fix: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "GPS Fix 3",
                    test_value: "fix",
                },
                gd: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "GD",
                    test_value: "gd",
                },
                gt: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "GT",
                    test_value: "gt",
                },
                dp: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "DP",
                    test_value: "dp",
                },
                dc: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "DC",
                    test_value: "dc",
                },
            };
    
            $scope.initialSettingSubTestCases = {
                setting: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "Setting",
                },
            };
    
            $scope.initialObdSubTestCases = {
                packet: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "Packet",
                },
                de: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "End Date (DE)",
                },
                te: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "End time (TE)",
                },
                dc: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "DC",
                },
                "ig/ebv/ibv": {
                    status: 0,
                    status_text: "Pending",
                    test_name: "IG/EBV/IBV",
                },
            };
    
            $scope.initialXcpSubTestCases = {
                xcp: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "Valid XCP packets",
                    counter: 0,
                    valid_gps_count: 0
                },
            };
    
            $scope.initialGenGpsSubTestCases = {
                fix: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "GPS Fix 3",
                    test_value: "fix",
                },
                gd: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "GD",
                    test_value: "gd",
                },
                gt: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "GT",
                    test_value: "gt",
                },
                g: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "GPS Cordinates",
                    test_value: "g",
                },
                ns: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "NS value greater than 5",
                    test_value: "ns",
                },
                dp: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "DP value less than 4",
                    test_value: "dp",
                },
                dc: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "DC value should be 1",
                    test_value: "dc",
                },
                dc3: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "DC3 value should be greater 3500",
                    test_value: "dc3",
                },
                st: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "ST value should be greater 20",
                    test_value: "st",
                },
            };
    
            $scope.initialGenHandshakeSubTestCases = {
                sim: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "SIM present",
                },
                tv: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "M66 (tv)",
                },
                stm: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "M66",
                },
                gc: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "GC",
                },
            };
    
            $scope.initialGenMessageSubTestCases = {
                dc3: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "DC3 value should be greater 3500",
                    test_value: "dc3",
                },
                genf: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "GENF",
                    test_value: "genf",
                },
                e: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "E",
                    test_value: "e",
                },
                prt: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "PRT",
                    test_value: "prt",
                },
                gen: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "Valid Gen Packet",
                    test_value: "gen",
                },
            };
        };
    
        $scope.initializeSubTestCases();
    
        function getSubtestCases(test) {
            switch (test) {
                case "gps":
                    return gpsSubTestCases();
                case "gen_gps":
                    return $scope.initialGenGpsSubTestCases;
                case "setting":
                    return $scope.initialSettingSubTestCases;
                case "handshake":
                    return handshakeSubTestCases();
                case "gen_handshake":
                    return $scope.initialGenHandshakeSubTestCases;
                case "message":
                    return obdSubTestCases();
                case "gen_message":
                    return $scope.initialGenMessageSubTestCases;
                case "xcp":
                    return $scope.initialXcpSubTestCases;
                default:
                    return [];
            }
        }
    
        function handshakeSubTestCases() {
            let defaultHandshakeSubTestCases = {
                vin: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "VIN",
                },
                op: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "OP",
                }
            }
            let toReturnHandshakeSubTestCase = defaultHandshakeSubTestCases;
            if (vm.selectedProduct == "OBD-MEV") {
                toReturnHandshakeSubTestCase = {
                    ...toReturnHandshakeSubTestCase,
                    tv: {
                        status: 0,
                        status_text: "Pending",
                        test_name: "TV"
                    },
                    stm: {
                        status: 0,
                        status_text: "Pending",
                        test_name: "STM Version"
                    },
                    sim: {
                        status: 0,
                        status_text: "Pending",
                        test_name: "SIM "
                    }
                }
            }
            return toReturnHandshakeSubTestCase;
        }
    
        function gpsSubTestCases() {
            let defaultGpsSubTestCases = {
                fix: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "GPS Fix 3",
                    test_value: "fix",
                },
                gd: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "GD",
                    test_value: "gd",
                },
                gt: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "GT",
                    test_value: "gt",
                },
                dp: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "DP",
                    test_value: "dp",
                },
                dc: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "DC",
                    test_value: "dc",
                },
            }
            let toReturnSubTestCases = defaultGpsSubTestCases;
            if (vm.selectedProduct == "OBD-MEV") {
                toReturnSubTestCases = {
                    ...toReturnSubTestCases,
                    st: {
                        status: 0,
                        status_text: "Pending",
                        test_name: "Signal Strength",
                        test_value: "st"
                    }
                }
            }
            return toReturnSubTestCases;
        }
    
        function obdSubTestCases() {
            let defaultTestCases = {
                packet: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "Packet",
                },
                de: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "End Date (DE)",
                },
                te: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "End time (TE)",
                },
                dc: {
                    status: 0,
                    status_text: "Pending",
                    test_name: "DC",
                },
            };
            let toReturnTestCases = defaultTestCases;
            if (vm.selectedProduct == "Max-Cube") {
                toReturnTestCases = {
                    ...toReturnTestCases,
                    "p-primary": {
                        status: 0,
                        status_text: "Pending",
                        test_name: "Primary Valid Packet",
                    },
                    "p-secondary": {
                        status: 0,
                        status_text: "Pending",
                        test_name: "Secondary Valid Packet",
                    },
                    "ig/ebv/ibv": {
                        status: 0,
                        status_text: "Pending",
                        test_name: "Valid IG/EBV/IBV Packet",
                    },
                    "xv": {
                        status: 0,
                        status_text: "Pending",
                        test_name: "Valid XV string",
                    },
                };
            }
            if (vm.selectedProduct == "OBD-MEV") {
                toReturnTestCases = {
                    ...toReturnTestCases,
                    "lmm": {
                        status: 0,
                        status_text: "Pending",
                        test_name: "LMM"
                    },
                    "type": {
                        status: 0,
                        status_text: "Pending",
                        test_name: "Type"
                    },
                    "pt": {
                        status: 0,
                        status_text: "Pending",
                        test_name: "Packet Time (PT)"
                    },
                    "e": {
                        status: 0,
                        status_text: "Pending",
                        test_name: "Engine on / off (E)"
                    },
                    "dc3": {
                        status: 0,
                        status_text: "Pending",
                        test_name: "DC3 (above 1700 and below 2800)"
                    },
                    "de": {
                        status: 0,
                        status_text: "Pending",
                        test_name: "DE"
                    },
                    "te": {
                        status: 0,
                        status_text: "Pending",
                        test_name: "TE"
                    }
                }
            }
            return toReturnTestCases;
        }
    
        vm.startTestTime = function (imei) {
            if (imei)
                vm.testing.tests[imei].start_time = new Date().valueOf();
        };
    
        vm.removeTestCase = function (imei, isSubmitTest) {
            for (var i = 0; i < vm.testing.imeis.length; i++) {
                if (vm.testing.imeis[i] === imei) {
                    vm.testing.imeis.splice(i, 1);
                    clientForTesting.unsubscribe('uimsg-' + imei, function (err) {
                        console.log(err);
                    });
                }
            }
            console.log("current imei status", vm.testing.tests[imei]);
            if (!isSubmitTest)
                vm.submitTest(imei);
        };
    
        vm.imeiLogs = {};
    
        function onMessageTest(topic, message) {
            var stringMessage = message.toString();
            if (stringMessage) {
                var parsedstring = JSON.parse(stringMessage);
                if (parsedstring.a == 'offline' || parsedstring.a == 'disconnected') {
                    vm.testing.tests[parsedstring.c].device_status = 'Offline';
                } else if (parsedstring.a == 'online' || parsedstring.a == 'connected') {
                    vm.testing.tests[parsedstring.c].device_status = 'Online';
                }
                else if (parsedstring.a == "published")
                    vm.testing.tests[parsedstring.c].device_status = 'Online';
                console.log(parsedstring);
                currentImei = parsedstring.c;
                if (vm.testing.tests[currentImei] && vm.testing.tests[currentImei].status == 1) {
                    clientForTesting.unsubscribe('uimsg-' + currentImei);
                    return;
                }
    
                // this approach needs to be removed
                // there has to be separate monitor 
                if (vm.testing.tests[currentImei] && vm.testing.tests[currentImei].start_time && (vm.testing.tests[parsedstring.c].start_time > 0)) {
                    var currentTimeStamp = new Date().valueOf();
                    var diff = currentTimeStamp - vm.testing.tests[currentImei].start_time;
                    // check if current time is greter than 5 min
                    if (diff > 450000 && vm.testing.tests[currentImei].status != 1) {
                        vm.testing.tests[currentImei].status = 0;
                        vm.submitTest(currentImei);
                    }
                }
                if (parsedstring.a == "message" || parsedstring.a == "published" && vm.testing.tests[parsedstring.c].start_time)
                    testMode(parsedstring);
                vm.imeiLogs[parsedstring.c].push({
                    event: parsedstring.tp,
                    message: parsedstring.msg,
                    time: parsedstring.t,
                    imei: parsedstring.c
                });
    
                $scope.messageLoading = false;
                $scope.$apply();
            }
    
        }
    
        vm.testing = {
            imeis: [],
            markall: false,
            tests: {}
        };
    
        vm.markall = false;
    
        vm.loadAllProducts = function () {
            var url = `${BASEURL}product/list?pnum=1&psize=50&token=${vm.token}`;
            get(url)
                .then(res => {
                    if (res && res.data && res.data.result && res.data.result.products && res.data.result.products.length > 0)
                        vm.products = res.data.result.products;
                    else
                        vm.products = [];
                });
        };
    
        vm.loadAllProducts();
    
        vm.productChanged = function () {
            let key = vm.selectedProduct;
            switch (key) {
                case 'VTS-Standard':
                    vm.testCases = [{ "showAnchor": false, "text": "Handshake", "checked": true, "value": "handshake" }, { "showAnchor": false, "text": "GPS", "checked": true, "value": "gps" }, { "showAnchor": false, "text": "Setting", "checked": true, "value": "setting" }];
                    break;
                case 'OBD-BB':
                    vm.testCases = [{ "showAnchor": false, "text": "Handshake", "checked": true, "value": "handshake" }, { "showAnchor": false, "text": "GPS", "checked": true, "value": "gps" }, { "showAnchor": false, "text": "Setting", "checked": true, "value": "setting" }, { "showAnchor": false, "text": "OBD Packet", "checked": true, "value": "message" }];
                    break;
                case 'VTS-Standard':
                    vm.testCases = [{ "showAnchor": false, "text": "Handshake", "checked": true, "value": "handshake" }, { "showAnchor": false, "text": "GPS", "checked": true, "value": "gps" }, { "showAnchor": false, "text": "Setting", "checked": true, "value": "setting" }, { "showAnchor": false, "text": "OBD Packet", "checked": true, "value": "message" }];
                    break;
                case 'OBD-MM':
                    vm.testCases = [{ "showAnchor": false, "text": "Handshake", "checked": true, "value": "handshake" }, { "showAnchor": false, "text": "GPS", "checked": true, "value": "gps" }, { "showAnchor": false, "text": "Setting", "checked": true, "value": "setting" }, { "showAnchor": false, "text": "OBD Packet", "checked": true, "value": "message" }];
                    break;
                case 'OBD-Standard':
                    vm.testCases = [{ "showAnchor": false, "text": "Handshake", "checked": true, "value": "handshake" }, { "showAnchor": false, "text": "GPS", "checked": true, "value": "gps" }, { "showAnchor": false, "text": "Setting", "checked": true, "value": "setting" }, { "showAnchor": false, "text": "OBD Packet", "checked": true, "value": "message" }];
                    break;
                case 'OBD-MEV':
                    vm.testCases = [{ "showAnchor": false, "text": "Handshake", "checked": true, "value": "handshake" }, { "showAnchor": false, "text": "GPS", "checked": true, "value": "gps" }, { "showAnchor": false, "text": "OBD Packet", "checked": true, "value": "message" }];
                    break;
                case 'OBD-Volvo':
                    vm.testCases = [{ "showAnchor": false, "text": "Handshake", "checked": true, "value": "handshake" }, { "showAnchor": false, "text": "GPS", "checked": true, "value": "gps" }, { "showAnchor": false, "text": "Setting", "checked": true, "value": "setting" }, { "showAnchor": false, "text": "OBD Packet", "checked": true, "value": "message" }];
                    break;
                case 'Max-Cube':
                    vm.testCases = [{ "showAnchor": false, "text": "Handshake", "checked": true, "value": "handshake" }, { "showAnchor": false, "text": "GPS", "checked": true, "value": "gps" }, { "showAnchor": false, "text": "Setting", "checked": true, "value": "setting" }, { "showAnchor": false, "text": "OBD Packet", "checked": true, "value": "message" }, { "showAnchor": false, "text": "Xcp", "checked": true, "value": "xcp" }];
                    break;
                case 'OBD-AL-FL':
                    vm.testCases = [{ "showAnchor": false, "text": "Handshake", "checked": true, "value": "handshake" }, { "showAnchor": false, "text": "GPS", "checked": true, "value": "gps" }, { "showAnchor": false, "text": "Setting", "checked": true, "value": "setting" }, { "showAnchor": false, "text": "OBD Packet", "checked": true, "value": "message" }];
                    break;
                case 'OBD-MCE':
                    vm.testCases = [{ "showAnchor": false, "text": "Handshake", "checked": true, "value": "handshake" }, { "showAnchor": false, "text": "GPS", "checked": true, "value": "gps" }, { "showAnchor": false, "text": "Setting", "checked": true, "value": "setting" }, { "showAnchor": false, "text": "OBD Packet", "checked": true, "value": "message" }];
                    break;
                case 'OBD-TC-HCV-BS6-FL':
                    vm.testCases = [{ "showAnchor": false, "text": "Handshake", "checked": true, "value": "handshake" }, { "showAnchor": false, "text": "GPS", "checked": true, "value": "gps" }, { "showAnchor": false, "text": "Setting", "checked": true, "value": "setting" }, { "showAnchor": false, "text": "OBD Packet", "checked": true, "value": "message" }];
                    break;
                case 'GEN-R4AW':
                    vm.testCases = [{ "showAnchor": false, "text": "GEN Handshake", "checked": true, "value": "gen_handshake" }, { "showAnchor": false, "text": "GEN GPS", "checked": true, "value": "gen_gps" }, { "showAnchor": false, "text": "GEN Message", "checked": true, "value": "gen_message" }];
                    break;
                case 'GEN-US24':
                    vm.testCases = [{ "showAnchor": false, "text": "GEN Handshake", "checked": true, "value": "gen_handshake" }, { "showAnchor": false, "text": "GEN GPS", "checked": true, "value": "gen_gps" }, { "showAnchor": false, "text": "GEN Message", "checked": true, "value": "gen_message" }];
                    break;
                case 'GEN-R424':
                    vm.testCases = [{ "showAnchor": false, "text": "GEN Handshake", "checked": true, "value": "gen_handshake" }, { "showAnchor": false, "text": "GEN GPS", "checked": true, "value": "gen_gps" }, { "showAnchor": false, "text": "GEN Message", "checked": true, "value": "gen_message" }];
                    break;
                case 'Max-Cube-AIS140':
                    vm.testCases = [{ "showAnchor": false, "text": "Handshake", "checked": true, "value": "handshake" }, { "showAnchor": false, "text": "GPS", "checked": true, "value": "gps" }, { "showAnchor": false, "text": "Setting", "checked": true, "value": "setting" }, { "showAnchor": false, "text": "OBD Packet", "checked": true, "value": "message" }];
                    break;
                default:
                    vm.testCases = [{ "showAnchor": false, "text": "GPS", "checked": true, "value": "gps" }];
                    break;
            }
        };
    
        function checkDeviceStatus(imei) {
    
            var url = BASEURL + '/idevice/' + imei + '/isonline?' + "token=" + vm.token;
            return $q(function (resolve, reject) {
                get(url).then(function (res) {
    
                    if (res.data.isonline == true) {
                        vm.testing.tests[imei].device_status = 'Online';
                    } else {
                        vm.testing.tests[imei].device_status = 'Offline';
                    }
                });
            });
        }
    
        vm.uploadFiles = [];
        vm.uploadFilesInfo = [];
        vm.imagePreview = [];
    
        $scope.onFileSelect = function (id) {
    
            function readAndPreview(file) {
                if (/\.(jpe?g|png|gif)$/i.test(file.name)) {
    
                    var reader = new FileReader();
                    reader.addEventListener("load", function (e) {
                        vm.imagePreview.push({
                            src: this.result,
                            name: file.name
                        });
                        file.src = this.result;
                    }, false);
                    reader.readAsDataURL(file);
    
                }
            }
    
            var selectedFile = document.getElementById(id).files;
            $timeout(function () {
                for (var i = 0; i < selectedFile.length; i++) {
                    vm.uploadFiles.push({
                        "name": selectedFile[i].name,
                        "type": selectedFile[i].type.split('/').pop(),
                    });
                    vm.uploadFilesInfo.push(selectedFile[i]);
                }
                console.log('vm.uploadFiles', vm.uploadFiles);
                console.log('vm.uploadFilesInfo', vm.uploadFilesInfo);
            }, 200);
            if (selectedFile) {
                [].forEach.call(selectedFile, readAndPreview);
            }
        };
    
        vm.removeImage = function (info) {
            var name = info.name;
            if (name) {
                vm.imagePreview = _.reject(vm.imagePreview, {
                    name: name
                });
                vm.uploadFiles = _.reject(vm.uploadFiles, {
                    name: name
                });
                vm.uploadFilesInfo = _.reject(vm.uploadFilesInfo, {
                    name: name
                });
            }
        }
    
        vm.saveUploadFiles = function (stage) {
            var url = BASEURL + `idevice/${vm.selectedimeiAssembly.imei}/assembly/images/${stage}/upload?token=${vm.token}`;
            console.log('after', url, vm.uploadFiles);
            post(url, vm.uploadFiles).then(function (response) {
                var prs = [];
                if (response.data && response.data.status && response.data.status.code == 200) {
                    response.data.result.map(function (f, i) {
                        if (f && f.url) {
                            vm.uploadFiles[i].file_key = f.file_key;
                            prs.push(uploadImage({
                                url: f.url,
                                file: vm.uploadFilesInfo[i]
                            }));
                        }
                    });
                    $q.all(prs)
                        .then(function (values) {
                            var status = values.map(function (currValue) {
                                if (currValue && currValue.status != 200)
                                    return false;
                                else
                                    return true;
                            });
                            if (status.indexOf(undefined) > -1 || status.indexOf(false) > -1)
                                toastr.error('Error uploading file');
                            else {
                                vm.updateAssemblyStatus(stage, 'success', vm.uploadFiles);
                            }
                        });
                } else {
                    toastr.error(response.data.status.message);
                }
            });
        };
    
        function uploadImage(info) {
            if (info && info.url) {
    
                function success(data) {
                    return data.status;
                }
                var pr = put(info.url, info.file);
                pr.then(success);
                return pr;
    
            }
        }
    
        vm.imageUrls = {};
    
        function loadImageUrl(stage) {
            var url = BASEURL + `idevice/${vm.selectedimeiAssembly.imei}/assembly/images/${stage}/download?token=${vm.token}`;
            get(url).then(function (response) {
                vm.imageUrls[stage] = response.data.result;
                console.log(vm.imageUrls);
    
            });
        }
    
        function put(url, request) {
            return $http({
                // method: 'GET',
                url: url,
                method: "PUT",
                headers: {
                    'Content-Type': 'application/json',
                    /*or whatever type is relevant */
                    'Accept': 'application/json' /* ditto */
                },
                data: request
            })
        }
    
        function renderTabs(user) {
            console.log('user info', user);
            vm.liveTabView = false;
            vm.historyTabView = false;
            vm.accountTabView = false;
            vm.deviceTestingTabView = false;
            vm.assemblyTabView = false;
            vm.deliveryChallanTabView = false;
            vm.oqcTabView = false;
            let is_si_user = false;
            if (user.type == "system_integrator" && user.role == "admin")
                is_si_user = true;
            if (user.is_intangles_user) {
                vm.liveTabView = true;
                vm.historyTabView = true;
                vm.accountTabView = true;
                vm.deviceTestingTabView = true;
                vm.deliveryChallanTabView = true;
                vm.oqcTabView = true;
            }
            if (is_si_user) {
                vm.liveTabView = true;
                vm.accountTabView = true;
                vm.deviceTestingTabView = true;
            }
            if (is_si_user == true || vm.hide_history_tab == true)
                vm.historyTabView = false;
            if (user.is_intangles_user && (user.role == 'assembly' || user.role == 'admin'))
                vm.assemblyTabView = true;
            if (user?.access_config?.brahma_hide_live) {
                vm.liveTabView = false;
                $scope.view = 'account';
            }
        }
        // vm.startTest('352913090243047');
    
        //#endregion
    
    
    });
    
    app.controller('mainCtrl', function ($scope, $http, $q, $window, $interval, $state, $location) {
        var vm = this;
    
        var BASEURL = "https://apis.intangles.com/";
        // BASEURL = "http://blue-apis.intangles.com/";
        // BASEURL = "http://localhost:3000/";
    
        $scope.username = ""
        $scope.password = "";
    
    
        $scope.login = function () {
            var url = BASEURL + 'v2/user/login';
            obj = {
                username: $scope.username,
                pwd: $scope.password
            };
    
            post(url, obj).then(function (data) {
    
    
                user = data.data.user;
                //console.log(user);
                if (!user) {
                    $scope.loginfailed = true;
                    $scope.loading = false;
                    $scope.error = "Invalid user!";
                    return;
                }
    
                //success
                if (user.is_enabled == false) {
                    $scope.loginfailed = true;
                    $scope.loading = false;
                    $scope.error = "Disabled user!";
                    return;
                }
                if (user != null) {
                    var u = user;
                    if (u.is_intangles_user === true) {
                        localStorage.setItem("User", JSON.stringify(user))
                        localStorage.setItem("UserToken", data.data.token);
                        localStorage.setItem("UserTokenDate", new Date().getTime());
                        vm.is_intangles_user = user.is_intangles_user;
                        $location.path("main");
                        $state.go("main");
                        return;
                    } else if (u.type == "system_integrator" && u.role == "admin") {
                        vm.is_si_user = true;
                        u.id = u.account_id;
                        localStorage.setItem("User", JSON.stringify(user))
                        localStorage.setItem("UserToken", data.data.token);
                        localStorage.setItem("UserTokenDate", new Date().getTime());
                        $location.path("main");
                        $state.go("main");
                        return;
                    } else { }
                }
                // $scope.loginfailed = true;
                // $scope.loading = false;
                // $scope.error = "Invalid user!";            
            }, function (error) {
                alert(JSON.stringify(error));
                console.log('error', error);
                $scope.loginfailed = true;
                $scope.loading = false;
                $scope.error = "Invalid user!";
            });
        };
    
        function post(url, request) {
            return $http({
                // method: 'GET',
                url: url,
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    /*or whatever type is relevant */
                    'Accept': 'application/json' /* ditto */
                },
                data: request
            })
        }
    
        function getTheUser(appconfig) {
            var user = localStorage.getItem("User");
            if (typeof user != 'string') {
    
                return null;
            }
            var token = localStorage.getItem("UserToken");
            if (!token) {
                return null;
            }
            return user
        }
    
        var user = getTheUser();
        if (user == null) {
            // $state.go("login");
            $location.path("login");
            $state.go("login");
        } else {
            $location.path("main");
            $state.go("main");
        }
    
        function get(url) {
    
            return $http({
                url: url,
                method: "get",
                headers: {
                    'Content-Type': 'application/json, text/plain, */*',
                }
            })
        }
    
    });
    
    app.animation('.my-list-item', function ($timeout) {
        return {
            enter: function (element, done) {
                element.addClass('firstelement');
                $timeout(function () {
                    element.removeClass('firstelement');
                    done();
                }, 5000);
            }
        };
    });
    
    app.filter('secondsToDateTime', [function () {
        return function (seconds) {
            return new Date(1970, 0, 1).setSeconds(seconds);
        };
    }]);
    
    app.directive('testing', function () {
        return {
            link: function (scope, element, attrs) {
            },
            templateUrl: 'testing.html'
        }
    });
    
    String.prototype.replaceAll = function (s, r) {
        return this.split(s).join(r)
    }