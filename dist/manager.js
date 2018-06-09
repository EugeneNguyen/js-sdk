"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ScalpsCoreRestApi = require("matchmore_alps_core_rest_api");
const Base64 = require("Base64");
const index_1 = require("./index");
const models = require("./model/models");
class Manager {
    constructor(apiKey, apiUrlOverride, persistenceManager, gpsConfig) {
        this.apiKey = apiKey;
        this.apiUrlOverride = apiUrlOverride;
        if (!apiKey)
            throw new Error("Api key required");
        this._persistenceManager =
            persistenceManager || new index_1.InMemoryPersistenceManager();
        this.defaultClient = ScalpsCoreRestApi.ApiClient.instance;
        this.token = JSON.parse(Base64.atob(this.apiKey.split(".")[1]));
        this.defaultClient.authentications["api-key"].apiKey = this.apiKey;
        // Hack the api location (to use an overidden value if needed)
        if (this.apiUrlOverride)
            this.defaultClient.basePath = this.apiUrlOverride;
        else
            this.apiUrlOverride = this.defaultClient.basePath;
        this._matchMonitor = new index_1.MatchMonitor(this);
        this._locationManager = new index_1.LocationManager(this, gpsConfig);
    }
    get apiUrl() {
        return this.defaultClient.basePath;
    }
    get defaultDevice() {
        return this._persistenceManager.defaultDevice();
    }
    get devices() {
        return this._persistenceManager.devices();
    }
    get publications() {
        return this._persistenceManager.publications();
    }
    get subscriptions() {
        return this._persistenceManager.subscriptions();
    }
    /**
     * Creates a mobile device
     * @param name
     * @param platform
     * @param deviceToken platform token for push notifications for example apns://apns-token or fcm://fcm-token
     * @param completion optional callback
     */
    createMobileDevice(name, platform, deviceToken, completion) {
        return this.createAnyDevice({
            deviceType: models.DeviceType.MobileDevice,
            name: name,
            platform: platform,
            deviceToken: deviceToken
        }, completion);
    }
    /**
     * Create a pin device
     * @param name
     * @param location
     * @param completion optional callback
     */
    createPinDevice(name, location, completion) {
        return this.createAnyDevice({
            deviceType: models.DeviceType.PinDevice,
            name: name,
            location: location
        }, completion);
    }
    /**
     * Creates an ibeacon device
     * @param name
     * @param proximityUUID
     * @param major
     * @param minor
     * @param location
     * @param completion optional callback
     */
    createIBeaconDevice(name, proximityUUID, major, minor, location, completion) {
        return this.createAnyDevice({
            deviceType: models.DeviceType.IBeaconDevice,
            name: name,
            proximityUUID: proximityUUID,
            major: major,
            minor: minor,
            location: location
        }, completion);
    }
    /**
     * Create a device
     * @param device whole device object
     * @param completion optional callback
     */
    createAnyDevice(device, completion) {
        device = this.setDeviceType(device);
        let p = new Promise((resolve, reject) => {
            let api = new ScalpsCoreRestApi.DeviceApi();
            let callback = function (error, data, response) {
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
        return p.then((device) => {
            let ddevice = this._persistenceManager.defaultDevice();
            let isDefault = !ddevice;
            this._persistenceManager.addDevice(device, isDefault);
            if (completion)
                completion(device);
            return device;
        });
    }
    setDeviceType(device) {
        if (this.isMobileDevice(device)) {
            device.deviceType = models.DeviceType.MobileDevice;
            return device;
        }
        if (this.isPinDevice(device)) {
            device.deviceType = models.DeviceType.PinDevice;
            return device;
        }
        if (this.isBeaconDevice(device)) {
            device.deviceType = models.DeviceType.IBeaconDevice;
            return device;
        }
        throw new Error("Cannot determine device type");
    }
    getUser(userId, completion) {
        let p = new Promise((resolve, reject) => {
            let api = new ScalpsCoreRestApi.UserApi();
            let callback = function (error, data, response) {
                if (error && error != "TypeError: data.map is not a function") {
                    reject("An error has occured while fetching user " + userId + ": " + error);
                }
                else {
                    // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                    resolve(JSON.parse(response.text));
                }
            };
            api.getUser(userId, callback);
        });
        p.then((user) => {
            if (completion)
                completion(user);
        });
        return p;
    }
    getDevice(userId, deviceId, completion) {
        let p = new Promise((resolve, reject) => {
            let api = new ScalpsCoreRestApi.DeviceApi();
            let callback = function (error, data, response) {
                if (error && error != "TypeError: data.map is not a function") {
                    reject("An error has occured while fetching device " + deviceId + ": " + error);
                }
                else {
                    // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                    resolve(JSON.parse(response.text));
                }
            };
            api.getDevice(userId, deviceId, callback);
        });
        p.then((user) => {
            if (completion)
                completion(user);
        });
        return p;
    }
    getPublication(userId, deviceId, publicationId, completion) {
        let p = new Promise((resolve, reject) => {
            let api = new ScalpsCoreRestApi.PublicationApi();
            let callback = function (error, data, response) {
                if (error && error != "TypeError: data.map is not a function") {
                    reject("An error has occured while fetching publication " + publicationId + ": " + error);
                }
                else {
                    // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                    resolve(JSON.parse(response.text));
                }
            };
            api.getPublication(userId, deviceId, publicationId, callback);
        });
        p.then((publication) => {
            if (completion)
                completion(publication);
        });
        return p;
    }
    deletePublication(userId, deviceId, publicationId, completion) {
        let p = new Promise((resolve, reject) => {
            let api = new ScalpsCoreRestApi.PublicationApi();
            let callback = function (error, data, response) {
                if (error && error != "TypeError: data.map is not a function") {
                    reject("An error has occured while deleting publication " + publicationId + ": " + error);
                }
                else {
                    // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                    resolve(JSON.parse(response.text));
                }
            };
            api.deletePublication(userId, deviceId, publicationId, callback);
        });
        p.then(() => {
            if (completion)
                completion();
        });
        return p;
    }
    getAllPublicationsForDevice(userId, deviceId, completion) {
        let p = new Promise((resolve, reject) => {
            let api = new ScalpsCoreRestApi.DeviceApi();
            let callback = function (error, data, response) {
                if (error) {
                    reject("An error has occured while fetching publications: " + error);
                }
                else {
                    // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                    resolve(JSON.parse(response.text));
                }
            };
            api.getPublications(userId, deviceId, callback);
        });
    }
    isMobileDevice(device) {
        return device.platform !== undefined;
    }
    isPinDevice(device) {
        return device.location !== undefined;
    }
    isBeaconDevice(device) {
        return device.major !== undefined;
    }
    /**
     * Create a publication for a device
     * @param topic topic of the publication
     * @param range range in meters
     * @param duration time in seconds
     * @param properties properties on which the sub selector can filter on
     * @param deviceId optional, if not provided the default device will be used
     * @param completion optional callback
     */
    createPublication(topic, range, duration, properties, deviceId, completion) {
        return this.withDevice(deviceId)(deviceId => {
            let p = new Promise((resolve, reject) => {
                let api = new ScalpsCoreRestApi.PublicationApi();
                let callback = function (error, data, response) {
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
                let publication = {
                    worldId: this.token.sub,
                    topic: topic,
                    deviceId: deviceId,
                    range: range,
                    duration: duration,
                    properties: properties
                };
                api.createPublication(deviceId, publication, callback);
            });
            return p.then((publication) => {
                this._persistenceManager.add(publication);
                if (completion)
                    completion(publication);
                return publication;
            });
        });
    }
    /**
     * Create a subscription for a device
     * @param topic topic of the subscription
     * @param range range in meters
     * @param duration time in seconds
     * @param selector selector which is used for filtering publications
     * @param deviceId optional, if not provided the default device will be used
     * @param completion optional callback
     */
    createSubscription(topic, range, duration, selector, deviceId, completion) {
        return this.withDevice(deviceId)(deviceId => {
            let p = new Promise((resolve, reject) => {
                let api = new ScalpsCoreRestApi.SubscriptionApi();
                let callback = function (error, data, response) {
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
                let subscription = {
                    worldId: this.token.sub,
                    topic: topic,
                    deviceId: deviceId,
                    range: range,
                    duration: duration,
                    selector: selector || ""
                };
                api.createSubscription(deviceId, subscription, callback);
            });
            return p.then((subscription) => {
                this._persistenceManager.add(subscription);
                if (completion)
                    completion(subscription);
                return subscription;
            });
        });
    }
    /**
     * Updates the device location
     * @param location
     * @param deviceId optional, if not provided the default device will be used
     * @param completion optional callback
     */
    updateLocation(location, deviceId) {
        return this.withDevice(deviceId)(deviceId => {
            let p = new Promise((resolve, reject) => {
                let api = new ScalpsCoreRestApi.LocationApi();
                let callback = function (error, data, response) {
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
            return p.then(_ => {
            });
        });
    }
    /**
     * Returns all current matches
     * @param deviceId optional, if not provided the default device will be used
     * @param completion optional callback
     */
    getAllMatches(deviceId, completion) {
        return this.withDevice(deviceId)(deviceId => {
            let p = new Promise((resolve, reject) => {
                let api = new ScalpsCoreRestApi.DeviceApi();
                let callback = function (error, data, response) {
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
            return p.then((matches) => {
                if (completion)
                    completion(matches);
                return matches;
            });
        });
    }
    /**
     * Returns a specific match for device
     * @param deviceId optional, if not provided the default device will be used
     * @param completion optional callback
     */
    getMatch(matchId, string, deviceId, completion) {
        return this.withDevice(deviceId)(deviceId => {
            let p = new Promise((resolve, reject) => {
                let api = new ScalpsCoreRestApi.DeviceApi();
                let callback = function (error, data, response) {
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
            return p.then((matches) => {
                if (completion)
                    completion(matches);
                return matches;
            });
        });
    }
    /**
     * Gets publications
     * @param deviceId optional, if not provided the default device will be used
     * @param completion optional callback
     */
    getAllPublications(deviceId, completion) {
        return this.withDevice(deviceId)(deviceId => {
            let p = new Promise((resolve, reject) => {
                let api = new ScalpsCoreRestApi.DeviceApi();
                let callback = function (error, data, response) {
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
    }
    withDevice(deviceId) {
        if (!!deviceId) {
            return (p) => p(deviceId);
        }
        ;
        if (!!this.defaultDevice && !!this.defaultDevice.id) {
            return (p) => p(this.defaultDevice.id);
        }
        ;
        throw new Error("There is no default device available and no other device id was supplied,  please call createDevice before thi call or provide a device id");
    }
    getSubscription(userId, deviceId, subscriptionId, completion) {
        let p = new Promise((resolve, reject) => {
            let api = new ScalpsCoreRestApi.SubscriptionApi();
            let callback = function (error, data, response) {
                if (error && error != "TypeError: data.map is not a function") {
                    reject("An error has occured while fetching subscription " + subscriptionId + ": " + error);
                }
                else {
                    // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                    resolve(JSON.parse(response.text));
                }
            };
            api.getSubscription(userId, deviceId, subscriptionId, callback);
        });
        p.then((subscription) => {
            if (completion)
                completion(subscription);
        });
        return p;
    }
    deleteSubscription(userId, deviceId, subscriptionId, completion) {
        let p = new Promise((resolve, reject) => {
            let api = new ScalpsCoreRestApi.SubscriptionApi();
            let callback = function (error, data, response) {
                if (error && error != "TypeError: data.map is not a function") {
                    reject("An error has occured while deleting subscription " + subscriptionId + ": " + error);
                }
                else {
                    // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                    resolve(JSON.parse(response.text));
                }
            };
            api.deleteSubscription(userId, deviceId, subscriptionId, callback);
        });
        p.then(() => {
            if (completion)
                completion();
        });
        return p;
    }
    getAllSubscriptionsForDevice(userId, deviceId, completion) {
        let p = new Promise((resolve, reject) => {
            let api = new ScalpsCoreRestApi.DeviceApi();
            let callback = function (error, data, response) {
                if (error) {
                    reject("An error has occured while fetching subscriptions: " + error);
                }
                else {
                    // Ensure that the json response is sent as pure as possible, sometimes data != response.text. Swagger issue?
                    resolve(JSON.parse(response.text));
                }
            };
            api.getSubscriptions(userId, deviceId, callback);
        });
        return p;
    }
    /**
     * Gets subscriptions
     * @param deviceId optional, if not provided the default device will be used
     * @param completion optional callback
     */
    getAllSubscriptions(deviceId, completion) {
        return this.withDevice(deviceId)(deviceId => {
            let p = new Promise((resolve, reject) => {
                let api = new ScalpsCoreRestApi.DeviceApi();
                let callback = function (error, data, response) {
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
    }
    /**
     * Registers a callback for matches
     * @param completion
     */
    set onMatch(completion) {
        this._matchMonitor.onMatch = completion;
    }
    /**
     * Register a callback for location updates
     * @param completion
     */
    set onLocationUpdate(completion) {
        this._locationManager.onLocationUpdate = completion;
    }
    startMonitoringMatches(mode) {
        this._matchMonitor.startMonitoringMatches(mode);
    }
    stopMonitoringMatches() {
        this._matchMonitor.stopMonitoringMatches();
    }
    startUpdatingLocation() {
        this._locationManager.startUpdatingLocation();
    }
    stopUpdatingLocation() {
        this._locationManager.stopUpdatingLocation();
    }
}
exports.Manager = Manager;
