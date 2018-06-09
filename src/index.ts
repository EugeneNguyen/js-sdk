import {Manager} from './manager';
import {IPersistenceManager} from "./persistence";

import InMemoryPersistenceManager from './persistences/InMemoryPersistenceManager';
import LocalStoragePersistenceManager from './persistences/LocalStoragePersistenceManager';
import PlatformConfig from './platform';

import {MatchMonitor, MatchMonitorMode} from './matchmonitor';
import {LocationManager, GPSConfig} from './locationmanager';

export {
  Manager,
  
  IPersistenceManager,
  InMemoryPersistenceManager,
  LocalStoragePersistenceManager,
  
  PlatformConfig,
  
  MatchMonitor,
  MatchMonitorMode,
  
  LocationManager,
  GPSConfig,
}