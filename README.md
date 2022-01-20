# OpenEDC

> OpenEDC is an electronic data capture (EDC) system for designing and conducting secure medical research studies based on the [CDISC ODM-XML](https://www.cdisc.org/standards/data-exchange/odm) standard. The standard is adopted without modifications to foster data exchange, metadata reuse, and open science.

#### Quick links

- [OpenEDC App](https://openedc.org/)
- [OpenEDC Server](https://github.com/imi-muenster/OpenEDC-Server)
- [Changelog](CHANGELOG.md)

## About

[OpenEDC](https://openedc.org/) is a cross-platform web application that works offline. The application itself is client-based. All data is exclusively processed on the local device it is running on. For security reasons, all data can be AES encrypted on the device as well.

An instance of the [OpenEDC Server](https://github.com/imi-muenster/OpenEDC-Server) can be hosted optionally to create a project with multiple users and sites. Forms already designed or data already captured with [openedc.org](https://openedc.org/) can be synced with the server. When connected to a server, all data is end-to-end encrypted by default. The application can work offline and syncs data back to the server when an internet connection could be re-established.

OpenEDC consists of three main modules. One for designing the metadata (i.e., the forms), one for capturing clinical data (including real-time validation checks and conditional skip patterns), and one for administrative settings when connected to an OpenEDC Server (i.e., managing users and sites).

<div align="center">
    <img src="https://static.uni-muenster.de/odm/mobile_1.png?" width="300">
    <img src="https://static.uni-muenster.de/odm/mobile_2.png?" width="300">
</div>

<div align="center">
    <img src="https://static.uni-muenster.de/odm/mobile_3.png?" width="300">
    <img src="https://static.uni-muenster.de/odm/mobile_4.png?" width="300">
</div>

<div align="center">
    <img src="https://static.uni-muenster.de/odm/data_capture.png?" width="900">
</div>

## Getting Started

These instructions will get you a copy of OpenEDC up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

OpenEDC is built with native HTML, CSS, and JavaScript and hence does not rely on a third-party JavaScript framework. A build step is not required.

### Installing

To get a development environment running, simply clone the repository and open the folder with a code editor of your choice. If you are using [Visual Studio Code](https://code.visualstudio.com/), we recommend the extension [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer). This extension starts a simple web server, opens the application in a new tab, and refrehes it after changes automatically. Without Visual Studio Code and Live Server you need to deploy the folder on a web server of your choice.

### Deployment

An own deployment is as easy as copying all files to a productive web server of your choice.

## Contributing

Feel free to submit reasonable changes like bugfixes or functional additions. We will look into and test every contribution and will accept it in case it provides value for the general community. When you are planning to make an extensive contribution, please first discuss the change you wish to make via issue, email, or any other method with the owners of this repository.

## Authors

* **Leonard Greulich** *(inital work)* | +49 (251) 83-54730 | leonard.greulich@uni-muenster.de

## License

This project is licensed under the MIT License — see the [LICENSE.md](LICENSE.md) file for details.
