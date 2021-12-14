# Changelog

All notable changes to this project will be documented in this file.

## 0.8.1

- Code list items can now be entered without explicitly stating coded values
- Visually highlight items with conditional skip logic
- Various smaller updates for improved plugin development

## 0.8.0

- This update introduces interactive, customizable, and responsive reports for OpenEDC
- Bar, pie, and donut charts can be used to filter data in real time
- Scatter charts can show item correlations by displaying two distinct items
- Support for absolute and relative item paths for conditional and calculated items
- First version of a plugin mechanism to develop encapsulated extensions for OpenEDC
- Various further internal improvements

## 0.7.1

- A new user button shows the name of the current user and allows to log out
- Minor usability enhancements for modals

## 0.7.0

- This update largely improves the server synchronization mechanism
- A notification shows up if metadata or a currently opened subject was edited remotely by another user
- After an app restart, metadata and subject data is only fetched from the server if it has changed to reduce data consumption

## 0.6.4

- Use of PBKDF2-based authentication key instead of simple password hash to impede brute-force attacks

## 0.6.3

- New item-specific audit trail that can be viewed with a button next to each item

## 0.6.2

- Show updated item values within the audit trail

## 0.6.1

- Custom date, time, and datetime picker for improved consistency across browsers

## 0.6.0

- Support for calculated items using ODM MethodDefs
- Support for complex conditions including AND, OR, and parentheses
- Calculations and conditions now work across events and forms
- Improved autocomplete support while entering calculation formulas and conditions
- Validation of formal expressions before saving
- Performance improvements for large metadata models by replacing XSLT with native JavaScript rendering

## 0.5.3

- Replaced LocalStorage with IndexedDB to be able to store more subjects offline
- New asynchronous metadata edit mode when connected to an OpenEDC server
- Various usability improvements

## 0.5.2

- New notifications to show assistive texts when creating a new project
- Further usability and stability improvements

## 0.5.1

- Usability and stability improvements

## 0.5.0

- This update largely improves the metadata module usability
- Advanced functions such as setting measurement units or collection conditions are no longer hidden in a modal but are now accessible right from the main details panel
- Autocomplete for measurement units, collection conditions, and codelist reuse from another item
- Option to update measurement units and collection conditions for multiple metadata elements at once
- List of parent elements where a metadata element is reused, i.e., is referenced

## 0.4.3

- Autocomplete for conditions, including suggestions for comparison operators and target values

## 0.4.2

- New option to add long lists of code list items using copy and paste
- Simplified reuse of existing code lists for new items

## 0.4.1

- Ability to use collection exception conditions with item groups

## 0.4.0

- Option to auto-number the subject key of new clinical data
- Create and open clinical subject data by scanning a barcode
- Replaced CryptoJS library with native Web Crypto API and comprehensive security improvements
- Possibility to use markdown in item group descriptions and item questions
- Major performance improvements for large projects

## 0.3.2

- Show the study event and form name instead of the OID in the audit trail
- Various stability and performance improvements

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
