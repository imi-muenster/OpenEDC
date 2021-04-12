# Changelog

All notable changes to this project will be documented in this file.

## 0.3.1

- Option to upload and merge ODM metadata into an existing project

## 0.3.0

- Forms from the Portal of Medical Data Models can now be transferred to OpenEDC via a button integrated into the metadata repository to quickly create databases
- The app is now fully internationalized which means that it can be localized to a new language by simply editing the respective language file (e.g., es.json)
- Added German localization
- Various other usability and stability improvements

## 0.2.7

- Support for the CDISC eCRF Portal
- Usability, textual, and layout improvements

## 0.2.6

- Added support for the double data type and rearranged the list of data types
- New logo

## 0.2.5

- Show the sites of subjects in the subject list when no site is selected as filter

## 0.2.4

- Show item data types directly within the metadata tree
- Improved the missing translation hint during metadata design

## 0.2.3

- Translated text elements without lang attribute are now used as fallback / defaults during data capture
- Boolean item translations (yes/no) are available for ten languages

## 0.2.2

- Logout button when local password encryption is used
- Various performance and stability improvements

## 0.2.1

- Added support for translated texts without lang attribute
- Integrated ODM upload validation and preparation

## 0.2.0

- Forms can now be marked as validated which also locks them for users without the new form validation authorization
- Dynamically hide and show the events column on desktop and mobile depending on the number of available metadata events
- Many other performance, stability, and usability improvements

## 0.1.5

- A form is now automatically marked as incomplete when at least one mandatory item was not answered
- An ODM Annotation and Flag element is now added to FormData elements which can be used to mark forms as validated/finalized in the future
- Cross-browser compatibility improvements

## 0.1.4

- New status icon for subjects to quickly see if and how much data has already been collected
- More granular status icon for study events to see whether the event has been completed without the need to open it
- Improved formatting of CSV export to support values with quotes and commas

## 0.1.3

- Option to remove locally stored and encrypted data if password is lost
- Improved drag and drop of elements into empty parent elements
- Solved problem where Safari on iOS or macOS would not store line breaks within multiline text areas
- Fixed problem where Firefox would download .csv files with .xml file extension

## 0.1.2

- Hide unavailable languages in clinical data module
- Improved readability of data types
- When connected to a server, disable form preview functionality for users without edit metadata right
- Improved escaping of HTML entities

## 0.1.1

- Added support for the time and datetime data types including data validation
- Option to upload a new ODM-XML file to an already initialized server
- Allow the title of a rendered form to break into multiple lines

## 0.1.0

- Initial release
