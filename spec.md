# PTAH TASK/TICKET SYSTEM

## Context
Ptah (named after the ancient Egyptian creator god), is a simplified, local/file system rip off of Jira/Youtrack etc. 

The idea is to have a simple easy to use personal ticketing/todo list application for a single local logged in user.

### Features
- Will need to maintain multiple projects that can be added or removed
    - All tickets, need to have a project
- Tickets will have the following properties
    - Unique ID
    - Title/Name
    - Project
    - Status
    - Priority (Lowest -> Highest)
    - Created Date
    - Due Date
    - Labels
    - Detailed MD description
    - Files/Media/Attachements
- Statuses can be
    - Backlog - in the pile, typical backlog
    - Scheduled - ready to work on
    - WIP - being worked on
    - Paused - In progress but paused
    - Done - Work has been done
    - Archive - tickets that are done
- MD description must support formatting
    - At a minimum, formatting like headers, text, bullets
    - Links
    - Media
- The application must support views
    - Swimlane that containes just Schedueld -> WIP -> Done, the swimlane view must show the paused work somewhere appropriate too
    - List views of everything
    - Seperate Backlog and Archive lists
- Filtering on
    - Name, labels, project, priority
    - Sorting by priority, created, due date
- A recycle bin for tickets, unless you delete a project, that and all tickets are perm deleted
- Export/Import functions (portable)
    - Able to import a single ticket  with everything but media from a md file
    - Import from a zipfile if it includes media
    - Able to export everything but media to a md file
    - If there is media on a ticket, export a zip file
    - Be able to bulk import export, with or without media

## Technical Spec
- Crossplatfrom Electron App
- Vuejs forontend
- Tickets can be stored as md files, along with their associated files, in a configurable location on the computer, by default userfolder Ptah
- Sennsible project structure
    - UI layer
    - Core service layer
    - Data / Storage Access Layer
    - Models that cross layers
    - Helpers/Utils that cross layers
    - Unit testing
- Claude subagents for
    - UI Work
    - Data/Storage, Core, Model logic
    - Unit tests / tester 
    - Documentation
- Easy to package for installation
    - Ideally host something in git to download maybe, a distributable
- Documenatation
    - Maintain comprehensive readme with instructions and guides
    - Changelog, not sure where
- Will be a git repo

## UI Spec
- Flat UI design
- Dark / Light / System
- Theme choices