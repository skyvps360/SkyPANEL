---
trigger: always_on
---

1. Always make new memories when it comes to editing and fixing parts of my application
2. when developing or editing parts of my app make sure to always use {companyName} variable to define the company name.
3. make sure to always abide by the /md-docs/brand-theme.md file which will help you better understand the applicaitons branding when editing / changing / removing / adding things to my app.
4. we use postgres neon database when pushing to database if creating indivdual scripts they need to use the same database connection as the rest of the app.
the connection string is stored in the .env file.
5. we have an extensive backend /admin and front end /dashboard these are how they are defined.
6. we use nextjs for the frontend and express for the backend.
7. the skypanel application heavily relies on virtfusions api system. We have also recently intrudcued interservers api for dns well virtfusion is used for servers.
8. alot of our applications settings are defined within /admin/settings under tab secitons for corrisponding settings.
9. we use gemini ai (but this needs training constantly i.e we need to always update the way the ai responds and act via the files already in place)
10. if you are unsure about something regarding my app search for `.md` files these should contain information in regards to what you are looking for to help figure the issue out better. If you still cant find what you need let the user know to inform them that you were unable to find what was needed.
11. always generate docs in .md inside of /md-docs/ folder this would allow us to always have an idea of what is going on within the app. If you edit something pertaining to the corrisponding md file pelase update the md file accordingly.
12. dont auto start my app ask first to confirm im not running it on production, as im using windows 10 but its running our app to the outside world via cloudflared tunnel service to expose the app (i do this myself unrelated to my application skypanel) i need to always use wsl first before running anything.
13. we use drizzle for postegres neondb.
14. always commit with detailed comments but dont ever push let me (the user) do this. THIS IS CRUCIAL TO ABIDE AND FOLLOW.