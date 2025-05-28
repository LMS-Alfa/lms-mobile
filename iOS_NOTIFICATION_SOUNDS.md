## iOS Notification Sounds

The app has custom notification sounds set up for different notification types on iOS devices.

### Sound Files

The sound files are located in the main iOS bundle:

- `attendance.caf` - Played for attendance notifications
- `grade.caf` - Played for grade/score notifications
- `message.caf` - Played for message notifications

### How Sounds Are Used

Sound files in iOS need to be in the `.caf` format. When sending a notification with Expo Notifications, you can specify the sound file:

```javascript
await Notifications.scheduleNotificationAsync({
	content: {
		title: 'Title',
		body: 'Message',
		data: { type: 'grade' },
		sound: 'grade.caf', // iOS requires the file extension
	},
	trigger: null, // null means show immediately
})
```

### Adding New Sounds

To add a new sound to the app:

1. Convert your sound file to `.caf` format
   - Use `afconvert -f caff -d LEI16@44100 -c 1 your-sound.wav your-sound.caf` on macOS
   - Or use online converters
2. Add the sound file to your Xcode project (make sure "Add to target" is checked)
3. Reference the sound file in your notification with its full filename

### Sound Requirements

- Sound files should be short (less than 30 seconds)
- They should be in `.caf` format for iOS
- File names should use only letters, numbers, underscores, and hyphens

### Testing Sounds

You can only test notification sounds on a physical device, not in the simulator.
