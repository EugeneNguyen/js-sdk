import ScalpsCoreRestApi = require('scalps_core_rest_api');
import { Manager } from './manager';

export class LocationManager {
    manager: Manager;

    private geoId;

    public onLocationUpdate: (location: ScalpsCoreRestApi.Location) => void;

    constructor(manager: Manager) {
        this.init(manager);
    }

    private init(manager) {
        this.manager = manager;
    }

    public startUpdatingLocation() {
        let watchOptions = {
            timeout: 60 * 60 * 1000,
            maxAge: 0,
            enableHighAccuracy: true
        };
        if (navigator.geolocation) {
            this.geoId = navigator.geolocation.watchPosition((loc) => { this.onLocationReceived(loc) }, this.onError, watchOptions);
        } else {
            throw new Error("Geolocation is not supported in this browser/app")
        }
    }

    public stopUpdatingLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.clearWatch(this.geoId);
        } else {
            throw new Error("Geolocation is not supported in this browser/app")
        }
    }

    private onLocationReceived(loc) {
        if (!loc.coords) return; // Guard for bad values
        let latitude, longitude, altitude;
        if (loc.coords.latitude)
            latitude = parseFloat(loc.coords.latitude);
        else
            return;
        //throw new Error("Location did not contain any latitude: " + JSON.stringify(loc));
        if (loc.coords.longitude)
            longitude = parseFloat(loc.coords.longitude);
        else
            return;
        //throw new Error("Location did not contain any longitude: " + JSON.stringify(loc));
        if (loc.coords.altitude)
            altitude = parseFloat(loc.coords.altitude);
        else
            altitude = 0; // Default value, TODO: use an altitude API?

        //TODO: Allow user to specify not to use altitude (forcing to some value)
        altitude = 0;

        this.onLocationUpdate(loc);
        try {
            this.manager.updateLocation(latitude, longitude, altitude, 1.0, 1.0);
        }
        catch (e) {
            // Allow to update location even when there is no device / user created
        }
    }

    private onError(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                throw new Error("User denied the request for Geolocation.");
            case error.POSITION_UNAVAILABLE:
                throw new Error("Location information is unavailable.");
            case error.TIMEOUT:
                throw new Error("The request to get user location timed out.");
            case error.UNKNOWN_ERROR:
                throw new Error("An unknown error occurred.");
        }
    }
}

