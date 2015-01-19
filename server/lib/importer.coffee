async = require 'async'
NotificationHelper = require 'cozy-notifications-helper'
log = require('printit')
    prefix: null
    date: true

Konnector = require '../models/konnector'
localization = require './localization_manager'
notification = new NotificationHelper 'konnectors'

module.exports = (konnector) ->
    # check if the konnector is created and if its not already importing
    if konnector.fieldValues? and konnector.isImporting is false
        log.debug "Importing #{konnector.slug}"
        model = require "../konnectors/#{konnector.slug}"
        konnector.import konnector, model.fields, (err) ->

            notificationSlug = konnector.slug
            if err?
                log.error err
                localizationKey = 'notification import error'
                notificationSlug += "_err"
            else
                localizationKey = 'notification import success'
                notificationSlug += "_success"

            msg = localization.t localizationKey, name: model.name
            notification.createOrUpdatePersistent notificationSlug,
                app: 'konnector'
                text: msg
                resource:
                    app: 'konnectors'
                    url: "konnector/#{konnector.slug}"
            , (err) ->
                log.error err if err?

    else
        log.debug "Connector #{konnector.slug} already importing"

    # Update the lastAutoImport with the current date
    data = lastAutoImport: new Date()
    konnector.updateAttributes data, (err) ->
        log.error err if err?
