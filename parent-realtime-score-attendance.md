# Result:

## 📡 Realtime Notifications Guide for LMS Parent Panel

**Goal**: When a teacher adds or updates a student's score or attendance, the parent should immediately receive a push notification - even when the app is closed or in the background.

---

### 🧠 How the Push Notification System Works

1. **Expo Push Notifications** are used instead of local notifications to ensure parents receive updates even when the app is closed.

2. **Database Triggers** detect changes in the `scores` and `attendance` tables and call a Supabase Edge Function.

3. The **Edge Function** retrieves the parent's push token and sends a notification through the Expo Push API.

4. Parents receive the notifications on their device even when the app is not actively running.

---

### 🔁 System Architecture

```
[Supabase Tables: scores, attendance]
           │
    🔄 Database Triggers
           │
           ▼
[Supabase Edge Function]
           │
 🔍 Find parent via student_id → Get Expo push token
           │
           ▼
📡 Send push notification via Expo Push API
           │
           ▼
📱 Parent receives push notification (even if app is closed)
```

---

### 🛠 Implementation Overview

### 1. 📦 Push Token Registration

When a user logs in, their Expo push token is registered and stored in Supabase:

```tsx
import * as Notifications from 'expo-notifications'

async function registerForPushNotifications(userId) {
	const { status } = await Notifications.requestPermissionsAsync()
	if (status !== 'granted') return null

	const token = (await Notifications.getExpoPushTokenAsync()).data

	// Save token to Supabase
	await storeExpoPushToken(userId, token)

	return token
}
```

---

### 2. 🔄 Database Triggers

SQL triggers detect changes in scores and attendance tables:

```sql
CREATE TRIGGER scores_push_notification_trigger
  AFTER INSERT OR UPDATE
  ON scores
  FOR EACH ROW
  EXECUTE FUNCTION trigger_score_push_notification();

CREATE TRIGGER attendance_push_notification_trigger
  AFTER INSERT OR UPDATE
  ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION trigger_attendance_push_notification();
```

---

### 3. 🚀 Edge Function

A Supabase Edge Function handles the notification delivery:

```typescript
// Inside edge function
const messages = tokens.map(tokenData => ({
	to: tokenData.token,
	sound: 'default',
	title: notificationData.title,
	body: notificationData.body,
	data: notificationData.data,
}))

// Send via Expo Push API
await fetch('https://exp.host/--/api/v2/push/send', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
	},
	body: JSON.stringify(messages),
})
```

---

### ✅ Row Level Security (RLS)

RLS policies ensure:

- Parents can only see data for their own children
- Edge Function operates with appropriate security
- Push tokens are securely stored and managed

---

### 🔚 Benefits

| Feature                               | Benefit                                                |
| ------------------------------------- | ------------------------------------------------------ |
| Works when app is closed              | Parents never miss important updates                   |
| Server-side processing                | Reduces mobile battery usage                           |
| Centralized notification logic        | Easier to maintain and update                          |
| Token management for multiple devices | Parents can receive notifications on all their devices |

---

### 📱 Notification Examples

**For Scores**:

- Title: "New Grade: Mathematics"
- Body: "John Smith received a grade of 85"

**For Attendance**:

- Title: "Attendance Update: History Class"
- Body: "John Smith was marked present"
