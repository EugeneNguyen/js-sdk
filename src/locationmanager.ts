<<<<<<< HEAD
import ScalpsCoreRestApi = require('matchmore_core_rest_api');
import { Manager } from './manager';
=======
import { Manager } from "./manager";
import * as models from "./model/models";
>>>>>>> quickfix/add_gitignore

export interface GPSConfig {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}

export class LocationManager {
  private _onLocationUpdate: (location: models.Location) => void;
  private _geoId;
  private _gpsConfig: GPSConfig;

  constructor(public manager: Manager, config?: GPSConfig) {
    this._gpsConfig = config || {
      enableHighAccuracy: false,
      timeout: 60000,
      maximumAge: 60000
    };
    this._onLocationUpdate = loc => {};
  }

  public startUpdatingLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this.onLocationReceived,
        this.onError,
        this._gpsConfig
      );
      this._geoId = navigator.geolocation.watchPosition(
        this.onLocationReceived,
        this.onError,
        this._gpsConfig
      );
    } else {
      throw new Error("Geolocation is not supported in this browser/app");
    }
  }

<<<<<<< HEAD
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
=======
  public stopUpdatingLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(this._geoId);
    } else {
      throw new Error("Geolocation is not supported in this browser/app");
>>>>>>> quickfix/add_gitignore
    }
  }

  set onLocationUpdate(onLocationUpdate: (location: models.Location) => void) {
    this._onLocationUpdate = onLocationUpdate;
  }

  private onLocationReceived(loc) {
    loc.coords.horizontalAccuracy = 1.0;
    loc.coords.verticalAccuracy = 1.0;

<<<<<<< HEAD
        //TODO: Allow user to specify not to use altitude (forcing to some value)
        altitude = 0;

        this.onLocationUpdate(loc);
        try {
            this.manager.updateLocation(latitude, longitude, altitude, 1.0, 1.0);
        }
        catch (e) {
            // Allow to update location even when there is no device / user created
        }
=======
    if (this._onLocationUpdate) {
      this._onLocationUpdate(loc);
>>>>>>> quickfix/add_gitignore
    }
    this.manager.updateLocation(loc.coords);
  }

  private onError(error) {
    throw new Error(error.message);
    // switch (error.code) {
    //   case error.PERMISSION_DENIED:
    //     throw new Error("User denied the request for Geolocation.");
    //   case error.POSITION_UNAVAILABLE:
    //     throw new Error("Location information is unavailable.");
    //   case error.TIMEOUT:
    //     throw new Error("The request to get user location timed out. " );
    //   case error.UNKNOWN_ERROR:
    //     throw new Error("An unknown error occurred.");
    // }
  }
}
