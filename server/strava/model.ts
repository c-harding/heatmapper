import { type SportType } from '@strava-heatmapper/shared/interfaces';

export type LatLng = [number, number];

export interface SummaryActivity {
  /** The unique identifier of the activity */ id: number;
  /** The identifier provided at upload time */ external_id: string;
  /** The identifier of the upload that resulted in this activity */ upload_id: number;
  /** An instance of MetaAthlete. */ athlete: { id: number };
  /** The name of the activity */ name: string;
  /** The activity's distance, in meters */ distance: number;
  /** The activity's moving time, in seconds */ moving_time: number;
  /** The activity's elapsed time, in seconds */ elapsed_time: number;
  /** The activity's total elevation gain. */ total_elevation_gain: number;
  /** The activity's highest elevation, in meters */ elev_high: number;
  /** The activity's lowest elevation, in meters */ elev_low: number;
  /** An instance of SportType. */ sport_type: SportType;
  /** The time at which the activity was started. */ start_date: string;
  /** The time at which the activity was started in the local timezone. */ start_date_local: string;
  /** The timezone of the activity */ timezone: string;
  /** An instance of LatLng. */ start_latlng: LatLng;
  /** An instance of LatLng. */ end_latlng: LatLng;
  /** The number of achievements gained during this activity */ achievement_count: number;
  /** The number of kudos given for this activity */ kudos_count: number;
  /** The number of comments for this activity */ comment_count: number;
  /** The number of athletes for taking part in a group activity */ athlete_count: number;
  /** The number of Instagram photos for this activity */ photo_count: number;
  /** The number of Instagram and Strava photos for this activity */ total_photo_count: number;
  /** An instance of PolylineMap. */ map: { summary_polyline: string };
  /** Whether this activity was recorded on a training machine */ trainer: boolean;
  /** Whether this activity is a commute */ commute: boolean;
  /** Whether this activity was created manually */ manual: boolean;
  /** Whether this activity is private */ private: boolean;
  /** Whether this activity is flagged */ flagged: boolean;
  /** The activity's workout type */ workout_type: number;
  /** The unique identifier of the upload in string format */ upload_id_str: string;
  /** The activity's average speed, in meters per second */ average_speed: number;
  /** The activity's max speed, in meters per second */ max_speed: number;
  /** Whether the logged-in athlete has kudoed this activity */ has_kudoed: boolean;
  /** Whether the activity is muted */ hide_from_home: boolean;
  /** The id of the gear for the activity */ gear_id: string;
  /** The total work done in kilojoules during this activity. Rides only */ kilojoules: number;
  /** Average power output in watts during this activity. Rides only */ average_watts: number;
  /** Whether the watts are from a power meter, false if estimated */ device_watts: boolean;
  /** Rides with power meter data only */ max_watts: number;
  /** Similar to Normalized Power. Rides with power meter data only */ weighted_average_watts: number;
  has_heartrate: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
}

export interface DetailedGear {
  /** The gear's unique identifier. */ id: string;
  /** Whether this gear's is the owner's default one. */ primary: boolean;
  /** The gear's name. */ name: string;
  /** The distance logged with this gear. */ distance: number;
  /** The gear's brand name. */ brand_name: string;
  /** The gear's model name. */ model_name: string;
  /** The gear's frame type (bike only). */ frame_type?: number;
  /** The gear's description. */ description: string;
}

export interface SummaryRoute {
  id_str: string;
  name: string;
  created_at: string;
  map: { summary_polyline: string };
  type: 1 | 2 | 3;
  sub_type: 1 | 2 | 3 | 4 | 5;
  distance: number;
  elevation_gain: number;
  starred: boolean;
}

export interface SummaryAthlete {
  /** The unique identifier of the athlete */ id: number;
  /** Resource state, indicates level of detail. Possible values: 1 -> "meta", 2 -> "summary", 3 -> "detail" */ resource_state:
    | 1
    | 2
    | 3;
  /** The athlete's first name. */ firstname: string;
  /** The athlete's last name. */ lastname: string;
  /** URL to a 62x62 pixel profile picture. */ profile_medium: string;
  /** URL to a 124x124 pixel profile picture. */ profile: string;
  /** The athlete's city. */ city: string;
  /** The athlete's state or geographical region. */ state: string;
  /** The athlete's country. */ country: string;
  /** The athlete's sex. May take one of the following values: M, F */ sex: string;
  /** Deprecated. Use summit field instead. Whether the athlete has any Summit subscription. */ premium: boolean;
  /** Whether the athlete has any Summit subscription. */ summit: boolean;
  /** The time at which the athlete was created. */ created_at: string;
  /** The time at which the athlete was last updated.  */ updated_at: string;
}
