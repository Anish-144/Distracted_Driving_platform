// SafeDrive Scenario Bank — 120+ unique distraction scenarios
// Organized by category for smart rotation

export interface ScenarioType {
  type: string;
  urgency: 'low' | 'medium' | 'high';
  category: string;
  description: string;
  voiceActorRole: 'passenger' | 'phone' | 'car' | 'environment' | 'radio' | 'navigation';
}

export const SCENARIO_BANK: ScenarioType[] = [
  // ── PHONE CALLS ────────────────────────────────────────────────────────────
  { type: 'incoming_call_boss', urgency: 'high', category: 'Phone Calls', description: 'Your boss is calling unexpectedly', voiceActorRole: 'phone' },
  { type: 'incoming_call_unknown', urgency: 'medium', category: 'Phone Calls', description: 'Unknown number calling repeatedly', voiceActorRole: 'phone' },
  { type: 'incoming_call_parent', urgency: 'high', category: 'Phone Calls', description: 'Elderly parent calling — may be urgent', voiceActorRole: 'phone' },
  { type: 'incoming_call_emergency', urgency: 'high', category: 'Phone Calls', description: 'Someone calling from a hospital', voiceActorRole: 'phone' },
  { type: 'incoming_call_spam', urgency: 'low', category: 'Phone Calls', description: 'Likely a spam or telemarketing call', voiceActorRole: 'phone' },
  { type: 'incoming_call_friend', urgency: 'low', category: 'Phone Calls', description: 'A close friend calling for a chat', voiceActorRole: 'phone' },
  { type: 'incoming_call_delivery', urgency: 'medium', category: 'Phone Calls', description: 'Delivery driver calling for directions', voiceActorRole: 'phone' },
  { type: 'incoming_call_school', urgency: 'high', category: 'Phone Calls', description: "Your child's school is calling", voiceActorRole: 'phone' },
  { type: 'incoming_call_bank', urgency: 'medium', category: 'Phone Calls', description: 'Bank calling about a transaction', voiceActorRole: 'phone' },
  { type: 'incoming_call_ex', urgency: 'medium', category: 'Phone Calls', description: 'An ex-partner is calling out of the blue', voiceActorRole: 'phone' },

  // ── MESSAGING / WHATSAPP ────────────────────────────────────────────────────
  { type: 'whatsapp_family_group', urgency: 'low', category: 'Messaging', description: 'Family group chat is blowing up', voiceActorRole: 'phone' },
  { type: 'whatsapp_urgent_friend', urgency: 'medium', category: 'Messaging', description: 'Friend sends "Call me ASAP" message', voiceActorRole: 'phone' },
  { type: 'whatsapp_work_group', urgency: 'high', category: 'Messaging', description: 'Work group chat with critical update', voiceActorRole: 'phone' },
  { type: 'whatsapp_meme_friend', urgency: 'low', category: 'Messaging', description: 'Friend sends a funny meme with a question', voiceActorRole: 'phone' },
  { type: 'whatsapp_photo_request', urgency: 'low', category: 'Messaging', description: 'Someone asks for a photo proof of location', voiceActorRole: 'phone' },
  { type: 'sms_delivery_otp', urgency: 'medium', category: 'Messaging', description: 'OTP code received for a delivery', voiceActorRole: 'phone' },
  { type: 'sms_bank_transaction', urgency: 'medium', category: 'Messaging', description: 'Bank OTP or transaction alert via SMS', voiceActorRole: 'phone' },
  { type: 'email_work_urgent', urgency: 'high', category: 'Messaging', description: 'Work email marked URGENT from manager', voiceActorRole: 'phone' },
  { type: 'email_flight_cancelled', urgency: 'high', category: 'Messaging', description: 'Airline email: your flight is cancelled', voiceActorRole: 'phone' },

  // ── GPS / NAVIGATION ────────────────────────────────────────────────────────
  { type: 'gps_rerouting', urgency: 'medium', category: 'GPS & Navigation', description: 'GPS recalculating due to road closure', voiceActorRole: 'navigation' },
  { type: 'gps_missed_turn', urgency: 'medium', category: 'GPS & Navigation', description: 'You missed the turn — recalculating', voiceActorRole: 'navigation' },
  { type: 'gps_traffic_jam', urgency: 'low', category: 'GPS & Navigation', description: 'Heavy traffic detected ahead, GPS rerouting', voiceActorRole: 'navigation' },
  { type: 'gps_destination_ambiguous', urgency: 'medium', category: 'GPS & Navigation', description: 'GPS found multiple destinations — needs input', voiceActorRole: 'navigation' },
  { type: 'gps_signal_lost', urgency: 'high', category: 'GPS & Navigation', description: 'GPS signal lost in tunnel area', voiceActorRole: 'navigation' },
  { type: 'gps_speed_camera', urgency: 'high', category: 'GPS & Navigation', description: 'Speed camera detected 500m ahead', voiceActorRole: 'navigation' },
  { type: 'gps_toll_booth', urgency: 'medium', category: 'GPS & Navigation', description: 'Toll booth approaching — prepare payment', voiceActorRole: 'navigation' },

  // ── SOCIAL MEDIA ────────────────────────────────────────────────────────────
  { type: 'social_media_controversial_comment', urgency: 'medium', category: 'Social Media', description: 'Someone commented on your controversial post', voiceActorRole: 'phone' },
  { type: 'social_media_viral_post', urgency: 'low', category: 'Social Media', description: 'Your post is going viral — notifications flooding', voiceActorRole: 'phone' },
  { type: 'social_media_story_mention', urgency: 'low', category: 'Social Media', description: 'You were mentioned in a story', voiceActorRole: 'phone' },
  { type: 'social_media_live_started', urgency: 'medium', category: 'Social Media', description: 'A friend started a live video — should you watch?', voiceActorRole: 'phone' },
  { type: 'social_media_breakup_post', urgency: 'medium', category: 'Social Media', description: 'Your ex posted a relationship update', voiceActorRole: 'phone' },
  { type: 'social_media_event_invite', urgency: 'low', category: 'Social Media', description: 'You got invited to a social event tonight', voiceActorRole: 'phone' },
  { type: 'social_media_dm_stranger', urgency: 'low', category: 'Social Media', description: 'A stranger sent you a direct message', voiceActorRole: 'phone' },

  // ── VEHICLE ALERTS ─────────────────────────────────────────────────────────
  { type: 'low_fuel_warning', urgency: 'medium', category: 'Vehicle Alerts', description: 'Fuel warning light turns on — range 15km', voiceActorRole: 'car' },
  { type: 'engine_overheating', urgency: 'high', category: 'Vehicle Alerts', description: 'Engine temperature warning light flashing', voiceActorRole: 'car' },
  { type: 'tyre_pressure_alert', urgency: 'high', category: 'Vehicle Alerts', description: 'Tyre pressure low warning', voiceActorRole: 'car' },
  { type: 'seatbelt_alarm', urgency: 'low', category: 'Vehicle Alerts', description: 'Passenger seatbelt not detected — alarm beeping', voiceActorRole: 'car' },
  { type: 'check_engine_light', urgency: 'medium', category: 'Vehicle Alerts', description: 'Check engine light suddenly turns on', voiceActorRole: 'car' },
  { type: 'door_ajar_alert', urgency: 'medium', category: 'Vehicle Alerts', description: 'Car dashboard shows door not fully closed', voiceActorRole: 'car' },
  { type: 'parking_brake_on', urgency: 'high', category: 'Vehicle Alerts', description: 'Driving with parking brake on — car dragging', voiceActorRole: 'car' },
  { type: 'low_battery_ev', urgency: 'high', category: 'Vehicle Alerts', description: 'EV battery at 5% — no charger nearby', voiceActorRole: 'car' },
  { type: 'windshield_wiper_error', urgency: 'medium', category: 'Vehicle Alerts', description: 'Wipers malfunction during sudden rain', voiceActorRole: 'car' },

  // ── PASSENGER / FAMILY DISTRACTIONS ────────────────────────────────────────
  { type: 'child_in_backseat', urgency: 'high', category: 'Passenger Distractions', description: 'Child in back seat is crying loudly', voiceActorRole: 'passenger' },
  { type: 'passenger_argument', urgency: 'high', category: 'Passenger Distractions', description: 'Passenger gets into a heated argument with you', voiceActorRole: 'passenger' },
  { type: 'passenger_loud_phone', urgency: 'low', category: 'Passenger Distractions', description: 'Passenger watching a loud video without headphones', voiceActorRole: 'passenger' },
  { type: 'passenger_directions', urgency: 'medium', category: 'Passenger Distractions', description: 'Passenger insisting on different route', voiceActorRole: 'passenger' },
  { type: 'passenger_sneezing', urgency: 'low', category: 'Passenger Distractions', description: 'Passenger sneezes violently, drops items', voiceActorRole: 'passenger' },
  { type: 'passenger_complains_ac', urgency: 'low', category: 'Passenger Distractions', description: 'Passenger demanding you adjust the AC', voiceActorRole: 'passenger' },
  { type: 'pet_in_car', urgency: 'medium', category: 'Passenger Distractions', description: 'Dog in back seat jumps to front seat', voiceActorRole: 'passenger' },
  { type: 'backseat_sibling_fight', urgency: 'medium', category: 'Passenger Distractions', description: 'Two siblings fighting loudly in the back', voiceActorRole: 'passenger' },

  // ── FOOD & PHYSICAL ────────────────────────────────────────────────────────
  { type: 'food_spill', urgency: 'medium', category: 'Physical Distractions', description: 'Hot coffee spills on your lap while driving', voiceActorRole: 'passenger' },
  { type: 'food_wrapper_dropped', urgency: 'low', category: 'Physical Distractions', description: 'Snack wrapper falls to the floor, gets under pedal', voiceActorRole: 'passenger' },
  { type: 'eating_while_driving', urgency: 'medium', category: 'Physical Distractions', description: 'Trying to eat a burger with one hand', voiceActorRole: 'passenger' },
  { type: 'sunglasses_dropped', urgency: 'low', category: 'Physical Distractions', description: 'Sunglasses fall down, partially blocking vision', voiceActorRole: 'passenger' },
  { type: 'itch_under_seatbelt', urgency: 'low', category: 'Physical Distractions', description: 'Uncomfortable itch under the seatbelt', voiceActorRole: 'environment' },

  // ── ROAD & ENVIRONMENT ─────────────────────────────────────────────────────
  { type: 'pedestrian_sudden_movement', urgency: 'high', category: 'Road Events', description: 'Pedestrian suddenly steps onto the road', voiceActorRole: 'environment' },
  { type: 'road_rage_driver', urgency: 'high', category: 'Road Events', description: 'Aggressive driver honking and tailgating', voiceActorRole: 'environment' },
  { type: 'police_siren_behind', urgency: 'high', category: 'Road Events', description: 'Police car with siren approaching from behind', voiceActorRole: 'environment' },
  { type: 'ambulance_approaching', urgency: 'high', category: 'Road Events', description: 'Ambulance approaching — need to pull over', voiceActorRole: 'environment' },
  { type: 'cyclist_cuts_in', urgency: 'high', category: 'Road Events', description: 'Cyclist cuts into lane unexpectedly', voiceActorRole: 'environment' },
  { type: 'pothole_sudden', urgency: 'medium', category: 'Road Events', description: 'Large pothole detected at last second', voiceActorRole: 'environment' },
  { type: 'jaywalking_child', urgency: 'high', category: 'Road Events', description: 'Child crosses road without looking', voiceActorRole: 'environment' },
  { type: 'debris_on_road', urgency: 'medium', category: 'Road Events', description: 'Large debris falls from truck ahead', voiceActorRole: 'environment' },

  // ── WEATHER ────────────────────────────────────────────────────────────────
  { type: 'sudden_rain', urgency: 'medium', category: 'Weather Events', description: 'Sudden heavy rain reduces visibility', voiceActorRole: 'environment' },
  { type: 'glare_sun', urgency: 'medium', category: 'Weather Events', description: 'Intense sun glare through windshield', voiceActorRole: 'environment' },
  { type: 'fog_dense', urgency: 'high', category: 'Weather Events', description: 'Sudden dense fog reduces visibility to 10m', voiceActorRole: 'environment' },
  { type: 'hail_storm', urgency: 'high', category: 'Weather Events', description: 'Hailstones hitting the windshield loudly', voiceActorRole: 'environment' },
  { type: 'wind_gust', urgency: 'medium', category: 'Weather Events', description: 'Strong wind gust pushes the car sideways', voiceActorRole: 'environment' },

  // ── RADIO & AUDIO ──────────────────────────────────────────────────────────
  { type: 'radio_breaking_news', urgency: 'medium', category: 'Radio & Audio', description: 'Breaking news bulletin interrupts music', voiceActorRole: 'radio' },
  { type: 'radio_quiz_question', urgency: 'low', category: 'Radio & Audio', description: 'Radio quiz asks a question — call in to win', voiceActorRole: 'radio' },
  { type: 'radio_traffic_alert', urgency: 'medium', category: 'Radio & Audio', description: 'Radio announces accident on your route', voiceActorRole: 'radio' },
  { type: 'music_emotional_song', urgency: 'low', category: 'Radio & Audio', description: 'A deeply emotional song plays — you zone out', voiceActorRole: 'radio' },
  { type: 'bluetooth_disconnected', urgency: 'low', category: 'Radio & Audio', description: 'Bluetooth disconnects mid-song, phone beeps', voiceActorRole: 'car' },
  { type: 'podcast_shocking_reveal', urgency: 'low', category: 'Radio & Audio', description: 'Podcast reveals shocking news that grabs attention', voiceActorRole: 'radio' },

  // ── COGNITIVE / MENTAL ─────────────────────────────────────────────────────
  { type: 'daydreaming', urgency: 'medium', category: 'Cognitive Distractions', description: 'You start daydreaming about a stressful event', voiceActorRole: 'environment' },
  { type: 'mental_math', urgency: 'low', category: 'Cognitive Distractions', description: 'Trying to calculate how long until arrival', voiceActorRole: 'environment' },
  { type: 'argument_replay', urgency: 'medium', category: 'Cognitive Distractions', description: 'Replaying an earlier argument in your head', voiceActorRole: 'environment' },
  { type: 'fatigue_microsleep', urgency: 'high', category: 'Cognitive Distractions', description: 'Tired — eyes closing for a split second', voiceActorRole: 'environment' },
  { type: 'worrying_about_meeting', urgency: 'medium', category: 'Cognitive Distractions', description: 'Anxious about an upcoming work presentation', voiceActorRole: 'environment' },

  // ── VISUAL / EXTERNAL ─────────────────────────────────────────────────────
  { type: 'billboard_interesting', urgency: 'low', category: 'Visual Distractions', description: 'Eye-catching billboard ad on the roadside', voiceActorRole: 'environment' },
  { type: 'accident_on_opposite_side', urgency: 'medium', category: 'Visual Distractions', description: 'Car accident on opposite lane — rubbernecking', voiceActorRole: 'environment' },
  { type: 'celebrity_spotted', urgency: 'low', category: 'Visual Distractions', description: 'You think you spot a celebrity on the sidewalk', voiceActorRole: 'passenger' },
  { type: 'beautiful_scenery', urgency: 'low', category: 'Visual Distractions', description: 'Stunning scenery grabs your attention', voiceActorRole: 'environment' },
  { type: 'unusual_vehicle', urgency: 'low', category: 'Visual Distractions', description: 'Unusual vehicle drives by — hard to ignore', voiceActorRole: 'environment' },
  { type: 'street_fight_spotted', urgency: 'medium', category: 'Visual Distractions', description: 'Two people arguing aggressively on the pavement', voiceActorRole: 'environment' },

  // ── NOTIFICATIONS & APPS ───────────────────────────────────────────────────
  { type: 'calendar_reminder', urgency: 'medium', category: 'App Notifications', description: 'Calendar reminder pops up for a meeting now', voiceActorRole: 'phone' },
  { type: 'payment_app_request', urgency: 'medium', category: 'App Notifications', description: 'Someone sent a payment request urgently', voiceActorRole: 'phone' },
  { type: 'food_delivery_arrived', urgency: 'low', category: 'App Notifications', description: 'Delivery app says food arrived — OTP needed', voiceActorRole: 'phone' },
  { type: 'ride_share_driver_arriving', urgency: 'medium', category: 'App Notifications', description: 'Ride-share driver arriving — need to confirm', voiceActorRole: 'phone' },
  { type: 'app_update_required', urgency: 'low', category: 'App Notifications', description: 'Phone shows mandatory app update popup', voiceActorRole: 'phone' },
  { type: 'low_battery_phone', urgency: 'medium', category: 'App Notifications', description: 'Phone battery at 5% — looking for charger', voiceActorRole: 'phone' },
  { type: 'game_notification', urgency: 'low', category: 'App Notifications', description: 'Mobile game sends "your village is under attack"', voiceActorRole: 'phone' },
  { type: 'news_alert_breaking', urgency: 'medium', category: 'App Notifications', description: 'Breaking news alert about a major world event', voiceActorRole: 'phone' },
  { type: 'stock_price_crash', urgency: 'high', category: 'App Notifications', description: 'Stock you own crashes — notification flashing', voiceActorRole: 'phone' },

  // ── WORK STRESS ────────────────────────────────────────────────────────────
  { type: 'work_deadline_panic', urgency: 'high', category: 'Work Stress', description: 'You suddenly remember you forgot a critical task', voiceActorRole: 'environment' },
  { type: 'conference_call_join', urgency: 'high', category: 'Work Stress', description: 'A work conference call is starting right now', voiceActorRole: 'phone' },
  { type: 'colleague_emergency_text', urgency: 'high', category: 'Work Stress', description: 'Colleague texts "system is down — help needed"', voiceActorRole: 'phone' },
  { type: 'rejection_email', urgency: 'medium', category: 'Work Stress', description: 'Job application rejection email arrives', voiceActorRole: 'phone' },

  // ── EMOTIONAL / PERSONAL ───────────────────────────────────────────────────
  { type: 'breakup_text', urgency: 'high', category: 'Emotional Distractions', description: 'Partner sends a breakup message while you drive', voiceActorRole: 'phone' },
  { type: 'bad_news_family', urgency: 'high', category: 'Emotional Distractions', description: 'Family member shares sudden bad news by text', voiceActorRole: 'phone' },
  { type: 'surprise_good_news', urgency: 'medium', category: 'Emotional Distractions', description: 'Exciting positive news that makes you elated', voiceActorRole: 'phone' },
  { type: 'social_anxiety_trigger', urgency: 'medium', category: 'Emotional Distractions', description: 'Someone left you on read — anxiety spiral', voiceActorRole: 'environment' },

  // ── PARKING / DESTINATION STRESS ──────────────────────────────────────────
  { type: 'parking_spot_fight', urgency: 'medium', category: 'Destination Stress', description: 'Another car stealing your parking spot', voiceActorRole: 'environment' },
  { type: 'late_for_appointment', urgency: 'high', category: 'Destination Stress', description: 'Realising you are going to be very late', voiceActorRole: 'environment' },
  { type: 'wrong_address', urgency: 'medium', category: 'Destination Stress', description: 'You discover you drove to the wrong address', voiceActorRole: 'navigation' },
];

/**
 * Get a shuffled subset of scenarios, excluding recently seen types.
 */
export function getSessionScenarios(count: number, recentTypes: Set<string> = new Set()): ScenarioType[] {
  const available = SCENARIO_BANK.filter(s => !recentTypes.has(s.type));
  const pool = available.length >= count ? available : SCENARIO_BANK;

  // Shuffle using Fisher-Yates
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

/** Get urgency weight for adaptive difficulty */
export function getUrgencyWeight(urgency: ScenarioType['urgency']): number {
  return urgency === 'high' ? 0.8 : urgency === 'medium' ? 0.5 : 0.2;
}
