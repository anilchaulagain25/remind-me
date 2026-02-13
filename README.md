# RemindMe - Beautiful Reminder App 🔔

A lightweight, mobile-friendly Progressive Web App (PWA) for managing reminders with push notifications.

## Features ✨

- **Beautiful UI** - Modern, gradient-based design optimized for mobile
- **Pre-built Templates** - Quick setup for common reminders (shown in the add modal):
  - 💧 Drink Water - Every hour during office hours (8-5, weekdays)
  - ✂️ Haircut - Monthly reminder
  - 🚿 Wash - Every 3 days
- **Custom Reminders** - Create your own with flexible scheduling:
  - Hourly, Daily, Every 3 days, Weekly, Monthly
  - Custom icons (emojis)
  - Time-specific notifications
  - **Flexible Day Selection** - Choose specific days (Mon-Fri), weekends, or custom combinations
  - Office hours support for hourly reminders
- **Progress Tracking** - Track completed reminders with history
- **History View** - See all your completed reminders with timestamps
- **Push Notifications** - Browser notifications to never miss a reminder
- **Offline Support** - Works without internet via Service Worker
- **PWA** - Install on your phone/desktop like a native app
- **Local Storage** - All data stored locally on your device

## Installation 📱

### Desktop/Mobile Browser:

1. Open `index.html` in a modern browser (Chrome, Edge, Safari, Firefox)
2. Click the install prompt or use browser's "Install App" option
3. Allow notifications when prompted

### Local Development:

```bash
# Serve with any static server
python3 -m http.server 8000
# or
npx serve .
# or
php -S localhost:8000
```

Then visit `http://localhost:8000`

## Usage 🚀

### Quick Start with Templates:

1. Click the **+** button to open the add reminder modal
2. Click any template card at the top (Haircut, Wash, Drink Water)
3. Adjust settings if needed
4. Click "Save"

### Create Custom Reminder:

1. Click the **+** button in the header
2. Fill in:
   - Title
   - Icon (choose from emojis)
   - Frequency
   - Time (or active hours for hourly reminders)
   - **Days** - Use quick presets (Every Day, Weekdays, Weekend) or select specific days
3. Click "Save"

### Manage Reminders:

- ✏️ **Edit** - Click the pencil icon
- 🗑️ **Delete** - Click the trash icon
- ✓ **Complete** - Mark reminder as done (automatically adds to history)
- **Filter** - View All, Active, or Completed reminders
- 📜 **History** - Click the clock icon in the header to view completion history

### Enable Notifications:

1. Click "Enable" on the notification banner
2. Allow notifications in your browser
3. Reminders will appear automatically at scheduled times

## Tech Stack 🛠

- **Vanilla JavaScript** - No frameworks, super lightweight (<15KB)
- **CSS3** - Modern gradients, animations, mobile-first design
- **PWA APIs** - Service Worker, Web Manifest, Notifications API
- **Local Storage API** - Client-side data persistence

## Browser Support 🌐

- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- Opera 76+

_Note: Push notifications require HTTPS in production (except localhost)_

## Features Detail 📋

### Notification System:

- Scheduled notifications based on frequency
- Auto-reschedules after completion
- Office hours support (8-5, weekdays only)
- Silent during non-office hours for hourly reminders

### PWA Features:

- Install to home screen
- Offline functionality
- App-like experience
- Splash screen
- Theme color

### Data Management:

- All data stored locally
- No backend required
- Privacy-focused (no data collection)
- Export/backup via browser storage

## Customization 🎨

### Change Colors:

Edit CSS variables in `styles.css`:

```css
:root {
  --primary: #6366f1;
  --secondary: #8b5cf6;
  /* ... */
}
```

### Add More Templates:

Edit `templates` array in `app.js`:

```javascript
const templates = [
  {
    title: "Your Reminder",
    icon: "🎯",
    frequency: "daily",
    time: "09:00",
    workdaysOnly: false,
  },
];
```

## Troubleshooting 🔧

**Notifications not working?**

- Ensure notifications are enabled in browser settings
- Check that you clicked "Allow" on the permission prompt
- For iOS Safari, add to Home Screen first

**Icons not showing?**

- Convert SVG files to PNG for better compatibility
- Use online tools or ImageMagick:
  ```bash
  convert icon-192.png -resize 192x192 icon-192.png
  ```

**App not installing?**

- Ensure you're using HTTPS (or localhost)
- Check browser console for errors
- Verify manifest.json is accessible

## License 📄

Free to use and modify for personal and commercial projects.

## Credits 👏

Built with ❤️ using vanilla web technologies.

---

**Enjoy staying organized! 🎉**
# remind-me
# remind-me
