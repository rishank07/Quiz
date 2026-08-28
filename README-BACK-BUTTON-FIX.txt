ExamFusion Prep - Microsoft Store Back Button Fix
=================================================

Certification issue fixed
-------------------------
Microsoft Store policy: 10.1.2.10 Functionality
Reported issue: After selecting a topic, users could not go back.

What this patch does
--------------------
- Adds a visible, accessible "Back" button to every inner app page.
- Uses browser history after normal in-app navigation.
- Falls back to the ExamFusion Prep home page when an inner page is opened directly.
- Supports Alt+Left and the BrowserBack keyboard key.
- Keeps the button off the home page and printed pages.
- Adds the shared script to five legacy pages that did not load it before.

How to deploy
-------------
1. Extract this ZIP into the ROOT of the Quiz GitHub repository.
2. Allow the included files to replace the matching repository files.
3. Commit and push the changes to the master branch.
4. Wait for examfusionprep.com to finish deploying.
5. Open https://examfusionprep.com in a fresh/private browser window.
6. Select "GhatnaChakra Purvalokan" and confirm the "Back" button appears.
7. Open a subject/topic, use Back repeatedly, and confirm every step returns correctly.
8. Test the same flow inside the installed Windows app.

Microsoft Store resubmission
----------------------------
The existing validated app package can remain in the submission because the packaged
PWABuilder launcher opens the live examfusionprep.com website. After the website fix is
live and verified, resubmit the draft for certification.

Suggested certification note
----------------------------
Fixed the navigation issue reported under policy 10.1.2.10. A visible and keyboard-
accessible Back button is now available on all inner pages. It returns users to the
previous in-app page and falls back to the home page for direct page launches. We
verified the reported flow: launch app, select GhatnaChakra Purvalokan, select a topic,
and navigate back successfully.
