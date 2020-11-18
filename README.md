# OpenEDC
A free and open-source electronic data capture (EDC) system that lets you create and conduct secure clinical research studies based on the <a target="_blank" href="https://www.cdisc.org/standards/data-exchange/odm">CDISC ODM-XML</a> format.

OpenEDC is a cross-platform, web-based application that can be installed as a standalone app and works offline. The application itself is client-based. All data is exclusively processed on the local device it is running on. For security, data can be AES encrypted on the device as well.

An instance of the OpenEDC Server can be hosted optionally to create a project with multiple users and sites. Forms that were already designed or data that was already captured with the openly available app can be synced with the server. When connected to a server, all data is end-to-end encrypted by default. Moreover, the application will still work offline and syncs all data back to the server automatically when an Internet connection could be re-established.

The application consists of three main modules. One for designing the metadata (i.e., the forms), one for capturing data (including real-time validity checks), and one for administrative settings when connected to an OpenEDC Server (i.e., adding users and sites).

<div align="center">
    <img src="https://static.uni-muenster.de/lsregister/libreEDC_1.png" width="700">
</div>

<div align="center">
    <img src="https://static.uni-muenster.de/lsregister/libreEDC_2.png" width="700">
</div>

<div align="center">
    <img src="https://static.uni-muenster.de/lsregister/libreEDC_3.png" width="300">
</div>

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

The OpenEDC functionality is built with vanilla JavaScript and HTML and hence does not rely on a thrid-party JavaScript framework. However, <a target="_blank" href="https://github.com/brix/crypto-js">crypto-js</a>, a JavaScript library of crypto standards, is needed for the local AES encryption or end-to-end encryption when connected to a server. A build step is not required.

### Installing

To get a development environment running, simply clone the repository and open the folder with a code editor of your choice. If you are using [Visual Studio Code](https://code.visualstudio.com/), we recommend the extension [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer). This extension starts a simple web server for you, opens the application in a new tab, and refrehes the pages after changes automatically. Without Visual Studio Code and Live Server you need to deploy the folder on a web server of your choice.

### Deployment

An own deployment is as easy as copying all files to a productive web server of your choice.

## Contributing

Feel free to submit reasonable changes like bugfixes or functional additions. We will look into and test every contribution and will accept it in case it provides value for the general community. When you are planning to make an extensive contribution, please first discuss the change you wish to make via issue, email, or any other method with the owners of this repository.

## Authors

* **Leonard Greulich** *(inital work)* | +49 (251) 83-54730 | leonard.greulich@uni-muenster.de

## License

This project is licensed under the MIT License — see the [LICENSE.md](LICENSE.md) file for details.
