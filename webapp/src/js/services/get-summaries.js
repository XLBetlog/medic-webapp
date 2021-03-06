var _ = require('underscore');

angular.module('inboxServices').factory('GetSummaries',
  function(
    DB,
    Session
  ) {

    'use strict';
    'ngInject';

    // WARNING: This is a copy of the medic/doc_summaries_by_id view
    // with some minor modifications and needs to be kept in sync until
    // this workaround is no longer needed.
    // https://github.com/medic/medic-webapp/issues/4666
    var summarise = function(doc) {
      if (!doc) {
        return;
      }

      var getLineage = function(contact) {
        var parts = [];
        while (contact) {
          if (contact._id) {
            parts.push(contact._id);
          }
          contact = contact.parent;
        }
        return parts;
      };

      var isMissingSubjectError = function(error) {
        if (error.code !== 'sys.missing_fields' || !error.fields) {
          return false;
        }

        if (error.fields.indexOf('patient_id') !== -1 ||
          error.fields.indexOf('patient_name') !== -1 ||
          error.fields.indexOf('place_id') !== -1) {
          return true;
        }

        return false;
      };

      var getSubject = function(doc) {
        var subject = {};
        var reference = doc.patient_id ||
                        (doc.fields && doc.fields.patient_id) ||
                        doc.place_id;
        var patientName = doc.fields && doc.fields.patient_name;
        if (patientName) {
          subject.name = patientName;
        }

        if (reference) {
          subject.value = reference;
          subject.type = 'reference';
        } else if (doc.fields && doc.fields.place_id) {
          subject.value = doc.fields.place_id;
          subject.type = 'id';
        } else if (patientName) {
          subject.value = patientName;
          subject.type = 'name';
        } else if (doc.errors) {
          doc.errors.forEach(function(error) {
            if (isMissingSubjectError(error)) {
              subject.type = 'unknown';
            }
          });
        }

        return subject;
      };

      if (doc.type === 'data_record' && doc.form) { // report
        return {
          _id: doc._id,
          _rev: doc._rev,
          from: doc.from || doc.sent_by,
          phone: doc.contact && doc.contact.phone,
          form: doc.form,
          read: doc.read,
          valid: !doc.errors || !doc.errors.length,
          verified: doc.verified,
          reported_date: doc.reported_date,
          contact: doc.contact && doc.contact._id,
          lineage: getLineage(doc.contact && doc.contact.parent),
          subject: getSubject(doc)
        };
      } else if (doc.type === 'clinic' ||
          doc.type === 'district_hospital' ||
          doc.type === 'health_center' ||
          doc.type === 'person') { // contact
        return {
          _id: doc._id,
          _rev: doc._rev,
          name: doc.name || doc.phone,
          phone: doc.phone,
          type: doc.type,
          contact: doc.contact && doc.contact._id,
          lineage: getLineage(doc.parent),
          simprints_id: doc.simprints_id,
          date_of_death: doc.date_of_death,
          muted: doc.muted
        };
      }
    };

    var getRemote = function(ids) {
      return DB().query('medic/doc_summaries_by_id', { keys: ids }).then(function(response) {
         return _.map(response.rows, function(row) {
          row.value._id = row.id;
          return row.value;
        });
      });
    };

    var getLocal = function(ids) {
      return DB().allDocs({ keys: ids, include_docs: true }).then(function(response) {
        var summaries = _.map(response.rows, function(row) {
          return summarise(row.doc);
        });
        return summaries.filter(function(summary) {
          return summary;
        });
      });
    };

    /**
     * Replace contact ids with their names for ids
     */
    return function(ids) {
      if (Session.isOnlineOnly()) {
        return getRemote(ids);
      } else {
        return getLocal(ids);
      }
    };
  }
);
