# Android Notification Sounds

The app has custom notification sounds set up for different notification types on Android devices.

## Sound Files

- Format: MP3 or OGG (MP3 is widely supported)
- Duration: Short (recommended: 0.5-2 seconds)
- File size: Small (under 1MB)
- Sample rate: 44.1 kHz is standard

The sound files are located in the `android/app/src/main/res/raw` directory:

- `attendance.mp3` - Played for attendance notifications
- `grade.mp3` - Played for grade/score notifications
- `message.mp3` - Played for message notifications

## Using Sounds with Expo Notifications

The sound files are used in the app via Expo Notifications. When you call:

```javascript
await Notifications.scheduleNotificationAsync({
	content: {
		title: 'Title',
		body: 'Message',
		data: { type: 'grade' },
		sound: 'grade', // This references the sound file
	},
	trigger: null, // null means show immediately
})
```

Android will use the sound file specified, looking for a raw resource with that name.

## Notification Channels

The notification channels are set up in the `App.tsx` file with:

```javascript
// Configure Android channel
if (Platform.OS === 'android') {
	Notifications.setNotificationChannelAsync('default', {
		name: 'Default',
		importance: Notifications.AndroidImportance.MAX,
		vibrationPattern: [0, 250, 250, 250],
		lightColor: '#FF231F7C',
		sound: 'default',
	})

	// Create a second channel specifically for LMS notifications
	Notifications.setNotificationChannelAsync('lms-notifications', {
		name: 'LMS Notifications',
		description: 'Learning Management System notifications',
		importance: Notifications.AndroidImportance.HIGH,
		vibrationPattern: [0, 250, 250, 250],
		sound: 'default',
	})
}
```

## Manifest Requirements

Ensure your `AndroidManifest.xml` has the required permissions:

```xml
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

These permissions are required for notification functionality on Android.

## Adding New Sounds

To add a new sound to the app:

1. Add the sound file (in mp3 format) to `android/app/src/main/res/raw/`
2. Reference the sound by its filename (without extension) in your notification
3. Make sure the file name only uses lowercase letters, numbers, and underscores

## Troubleshooting

- If notification sounds don't play, check that:

  - The sound files are correctly placed in the `raw` directory
  - The file names match what you're using in the code (case-sensitive)
  - The device is not in Do Not Disturb mode
  - App notification settings are enabled on the device
  - Notification channel settings haven't been modified by the user

- On Android 13+ (API 33+), ensure the app has requested and received notification permissions.

## Testing Sounds

The sounds will play when notifications are triggered. The notification payload should include the sound name.
