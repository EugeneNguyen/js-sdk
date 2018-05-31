var ScalpsCoreRestApi = require("matchmore_alps_core_rest_api");
var Base64 = require("Base64");
var matchmonitor_1 = require("./matchmonitor");
var locationmanager_1 = require("./locationmanager");
var models = require("./model/models");
var persistence_1 = require("./persistence");
var Manager = (function () {
    function Manager(apiKey, apiUrlOverride, persistenceManager, gpsConfig) {
        this.apiKey = apiKey;
        this.apiUrlOverride = apiUrlOverride;
        if (!apiKey)
            throw new Error("Api key required");
        this._persistenceManager =
            persistenceManager || new persistence_1.InMemoryPersistenceManager();
        this.defaultClient = ScalpsCoreRestApi.ApiClient.instance;
        this.token = JSON.parse(Base64.atob(this.apiKey.split(".")[1])); // as Token;
        this.defaultClient.authentications["api-key"].apiKey = this.apiKey;
        // Hack the api location (to use an overidden value if needed)
        if (this.apiUrlOverride)
            this.defaultClient.basePath = this.apiUrlOverride;
        else
            this.apiUrlOverride = this.defaultClient.basePath;
        this._matchMonitor = new matchmonitor_1.MatchMonitor(this);
        this._locationManager = new locationmanager_1.LocationManager(this, gpsConfig);
    }
    Object.defineProperty(Manager.prototype, "apiUrl", {
        get: function () {
            return this.defaultClient.basePath;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Manager.prototype, "defaultDevice", {
        get: function () {
            return this._persistenceManager.defaultDevice();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Manager.prototype, "devices", {
        get: function () {
            return this._persistenceManager.devices();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Manager.prototype, "publications", {
        get: function () {
            return this._persistenceManager.publications();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Manager.prototype, "subscriptions", {
        get: function () {
            return this._persistenceManager.subscriptions();
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Creates a mobile device
     * @param name
     * @param platform
     * @param deviceToken platform token for push notifications for example apns://apns-token or fcm://fcm-token
     * @param completion optional callback
     */
    Manager.prototype.createMobileDevice = function (name, platform, deviceToken, completion) {
        return this.createAnyDevice({
            deviceType: models.DeviceType.MobileDevice,
            name: name,
            platform: platform,
            deviceToken: deviceToken
        }, completion);
    };
    /**
     * Create a pin device
     * @param name
     * @param location
     * @param completion optional callback
     */
    Manager.prototype.createPinDevice = function (name, location, completion) {
        return this.createAnyDevice({
            deviceType: models.DeviceType.PinDevice,
            name: name,
            location: location
        }, completion);
    };
    /**
     * Creates an ibeacon device
     * @param name
     * @param proximityUUID
     * @param major
     * @param minor
     * @param location
     * @param completion optional callback
     */
    Manager.prototype.createIBeaconDevice = function (name, proximityUUID, major, minor, location, completion) {
        return this.createAnyDevice({
            deviceType: models.DeviceType.IBeaconDevice,
            name: name,
            proximityUUID: proximityUUID,
            major: major,
            minor: minor,
            location: location
        }, completion);
    };
    /**
     * Create a device
     * @param device whole device object
     * @param completion optional callback
     */
    Manager.prototype.createAnyDevice = function (device, completion) {
        var _this = this;
        device = this.setDeviceType(device);
        var p = new Promise(function (resolve, reject) {
            var api = new ScalpsCoreRestApi.DeviceApi();
            var callback = function (error, data, response) {
                if (error) {
                    reject("An error has occured while creating device '" +
                        device.name +
                        "' :" +
                        error);
                }
                else {
                    // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                    resolve(JSON.parse(response.text));
                }
            };
            api.createDevice(device, callback);
        });
        return p.then(function (device) {
            var ddevice = _this._persistenceManager.defaultDevice();
            var isDefault = !ddevice;
            _this._persistenceManager.addDevice(device, isDefault);
            if (completion)
                completion(device);
            return device;
        });
    };
    Manager.prototype.setDeviceType = function (device) {
        if (this.isMobileDevice(device)) {
            device.deviceType = models.DeviceType.MobileDevice;
            return device;
        }
        if (this.isBeaconDevice(device)) {
            device.deviceType = models.DeviceType.IBeaconDevice;
            return device;
        }
        if (this.isPinDevice(device)) {
            device.deviceType = models.DeviceType.PinDevice;
            return device;
        }
        throw new Error("Cannot determine device type");
    };
    Manager.prototype.isMobileDevice = function (device) {
        return device.platform !== undefined;
    };
    Manager.prototype.isPinDevice = function (device) {
        return device.location !== undefined;
    };
    Manager.prototype.isBeaconDevice = function (device) {
        return device.major !== undefined;
    };
    /**
     * Create a publication for a device
     * @param topic topic of the publication
     * @param range range in meters
     * @param duration time in seconds
     * @param properties properties on which the sub selector can filter on
     * @param deviceId optional, if not provided the default device will be used
     * @param completion optional callback
     */
    Manager.prototype.createPublication = function (topic, range, duration, properties, deviceId, completion) {
        var _this = this;
        return this.withDevice(deviceId)(function (deviceId) {
            var p = new Promise(function (resolve, reject) {
                var api = new ScalpsCoreRestApi.PublicationApi();
                var callback = function (error, data, response) {
                    if (error) {
                        reject("An error has occured while creating publication '" +
                            topic +
                            "' :" +
                            error);
                    }
                    else {
                        // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                        resolve(JSON.parse(response.text));
                    }
                };
                var publication = {
                    worldId: _this.token.sub,
                    topic: topic,
                    deviceId: deviceId,
                    range: range,
                    duration: duration,
                    properties: properties
                };
                api.createPublication(deviceId, publication, callback);
            });
            return p.then(function (publication) {
                _this._persistenceManager.add(publication);
                if (completion)
                    completion(publication);
                return publication;
            });
        });
    };
    /**
     * Create a subscription for a device
     * @param topic topic of the subscription
     * @param range range in meters
     * @param duration time in seconds
     * @param selector selector which is used for filtering publications
     * @param deviceId optional, if not provided the default device will be used
     * @param completion optional callback
     */
    Manager.prototype.createSubscription = function (topic, range, duration, selector, deviceId, completion) {
        var _this = this;
        return this.withDevice(deviceId)(function (deviceId) {
            var p = new Promise(function (resolve, reject) {
                var api = new ScalpsCoreRestApi.SubscriptionApi();
                var callback = function (error, data, response) {
                    if (error) {
                        reject("An error has occured while creating subscription '" +
                            topic +
                            "' :" +
                            error);
                    }
                    else {
                        // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                        resolve(JSON.parse(response.text));
                    }
                };
                var subscription = {
                    worldId: _this.token.sub,
                    topic: topic,
                    deviceId: deviceId,
                    range: range,
                    duration: duration,
                    selector: selector || ""
                };
                api.createSubscription(deviceId, subscription, callback);
            });
            return p.then(function (subscription) {
                _this._persistenceManager.add(subscription);
                if (completion)
                    completion(subscription);
                return subscription;
            });
        });
    };
    /**
     * Updates the device location
     * @param location
     * @param deviceId optional, if not provided the default device will be used
     * @param completion optional callback
     */
    Manager.prototype.updateLocation = function (location, deviceId) {
        return this.withDevice(deviceId)(function (deviceId) {
            var p = new Promise(function (resolve, reject) {
                var api = new ScalpsCoreRestApi.LocationApi();
                var callback = function (error, data, response) {
                    if (error) {
                        reject("An error has occured while creating location ['" +
                            location.latitude +
                            "','" +
                            location.longitude +
                            "']  :" +
                            error);
                    }
                    else {
                        // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                        resolve();
                    }
                };
                api.createLocation(deviceId, location, callback);
            });
            return p.then(function (_) {
            });
        });
    };
    /**
     * Returns all current matches
     * @param deviceId optional, if not provided the default device will be used
     * @param completion optional callback
     */
    Manager.prototype.getAllMatches = function (deviceId, completion) {
        return this.withDevice(deviceId)(function (deviceId) {
            var p = new Promise(function (resolve, reject) {
                var api = new ScalpsCoreRestApi.DeviceApi();
                var callback = function (error, data, response) {
                    if (error) {
                        reject("An error has occured while fetching matches: " + error);
                    }
                    else {
                        // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                        resolve(JSON.parse(response.text));
                    }
                };
                api.getMatches(deviceId, callback);
            });
            return p.then(function (matches) {
                if (completion)
                    completion(matches);
                return matches;
            });
        });
    };
    /**
     * Returns a specific match for device
     * @param deviceId optional, if not provided the default device will be used
     * @param completion optional callback
     */
    Manager.prototype.getMatch = function (matchId, string, deviceId, completion) {
        return this.withDevice(deviceId)(function (deviceId) {
            var p = new Promise(function (resolve, reject) {
                var api = new ScalpsCoreRestApi.DeviceApi();
                var callback = function (error, data, response) {
                    if (error) {
                        reject("An error has occured while fetching matches: " + error);
                    }
                    else {
                        // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                        resolve(JSON.parse(response.text));
                    }
                };
                api.getMatch(deviceId, matchId, callback);
            });
            return p.then(function (matches) {
                if (completion)
                    completion(matches);
                return matches;
            });
        });
    };
    /**
     * Gets publications
     * @param deviceId optional, if not provided the default device will be used
     * @param completion optional callback
     */
    Manager.prototype.getAllPublications = function (deviceId, completion) {
        return this.withDevice(deviceId)(function (deviceId) {
            var p = new Promise(function (resolve, reject) {
                var api = new ScalpsCoreRestApi.DeviceApi();
                var callback = function (error, data, response) {
                    if (error) {
                        reject("An error has occured while fetching publications: " + error);
                    }
                    else {
                        // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                        resolve(JSON.parse(response.text));
                    }
                };
                api.getPublications(deviceId, callback);
            });
            return p;
        });
    };
    Manager.prototype.withDevice = function (deviceId) {
        var _this = this;
        if (!!deviceId) {
            return function (p) { return p(deviceId); };
        }
        ;
        if (!!this.defaultDevice && !!this.defaultDevice.id) {
            return function (p) { return p(_this.defaultDevice.id); };
        }
        ;
        throw new Error("There is no default device available and no other device id was supplied,  please call createDevice before thi call or provide a device id");
    };
    /**
     * Gets subscriptions
     * @param deviceId optional, if not provided the default device will be used
     * @param completion optional callback
     */
    Manager.prototype.getAllSubscriptions = function (deviceId, completion) {
        return this.withDevice(deviceId)(function (deviceId) {
            var p = new Promise(function (resolve, reject) {
                var api = new ScalpsCoreRestApi.DeviceApi();
                var callback = function (error, data, response) {
                    if (error) {
                        reject("An error has occured while fetching subscriptions: " + error);
                    }
                    else {
                        // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                        resolve(JSON.parse(response.text));
                    }
                };
                api.getSubscriptions(deviceId, callback);
            });
            return p;
        });
    };
    Object.defineProperty(Manager.prototype, "onMatch", {
        /**
         * Registers a callback for matches
         * @param completion
         */
        set: function (completion) {
            this._matchMonitor.onMatch = completion;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Manager.prototype, "onLocationUpdate", {
        /**
         * Register a callback for location updates
         * @param completion
         */
        set: function (completion) {
            this._locationManager.onLocationUpdate = completion;
        },
        enumerable: true,
        configurable: true
    });
    Manager.prototype.startMonitoringMatches = function (mode) {
        this._matchMonitor.startMonitoringMatches(mode);
    };
    Manager.prototype.stopMonitoringMatches = function () {
        this._matchMonitor.stopMonitoringMatches();
    };
    Manager.prototype.startUpdatingLocation = function () {
        this._locationManager.startUpdatingLocation();
    };
    Manager.prototype.stopUpdatingLocation = function () {
        this._locationManager.stopUpdatingLocation();
    };
    return Manager;
})();
exports.Manager = Manager;