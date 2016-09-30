# See documentation on https://github.com/frankrousseau/americano#routes

konnectors = require './konnectors'
folders = require './folders'
index = require './index'
maif = require '../konnectors/maif.js'

module.exports =
    '':
        get: index.main

    'konnectorId':
        param: konnectors.getKonnector

    'konnectors/:konnectorId':
        get: konnectors.show
        put: konnectors.import
        delete: konnectors.remove

    'folders':
        get: folders.all

    'folders/:folderId':
        get: folders.show

    'public/getCode':
        get: maif.getCode