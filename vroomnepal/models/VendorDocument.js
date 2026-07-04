'use strict';

const db = require('../config/db');
const demoStore = require('../config/demoStore');

const REQUIRED_DOCUMENTS = [
  {
    type: 'national_id',
    title: 'National ID/Passport',
    description: 'Government identity document',
  },
  {
    type: 'driving_license',
    title: 'Driving License',
    description: 'Valid driver or operator license',
  },
  {
    type: 'business_license',
    title: 'Business License',
    description: 'Company registration or rental permit',
  },
];

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

function normalizeStatus(status) {
  return ['missing', 'pending', 'verified', 'rejected'].includes(status) ? status : 'missing';
}

function mergeRequiredDocuments(documents) {
  const byType = new Map((documents || []).map(document => [document.document_type, document]));
  return REQUIRED_DOCUMENTS.map(required => {
    const document = byType.get(required.type);
    return {
      id: document?.id || null,
      document_type: required.type,
      title: required.title,
      description: required.description,
      file_name: document?.file_name || null,
      file_type: document?.file_type || null,
      file_size: document?.file_size || null,
      status: normalizeStatus(document?.status),
      rejection_reason: document?.rejection_reason || null,
      reviewed_at: document?.reviewed_at || null,
      uploaded_at: document?.uploaded_at || null,
      updated_at: document?.updated_at || null,
    };
  });
}

const VendorDocument = {
  requiredDocuments: REQUIRED_DOCUMENTS,

  async findByVendor(vendorId) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return mergeRequiredDocuments(store.vendorDocuments.filter(document => Number(document.vendor_id) === Number(vendorId)));
    }

    const [rows] = await db.execute(
      `SELECT *
       FROM vendor_documents
       WHERE vendor_id = ?
       ORDER BY uploaded_at DESC`,
      [vendorId]
    );
    return mergeRequiredDocuments(rows);
  },

  async upsert({ vendor_id, document_type, file_name, file_type = null, file_size = null, file_data = null }) {
    const required = REQUIRED_DOCUMENTS.find(document => document.type === document_type);
    if (!required) throw new Error('Unsupported document type');

    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      let document = store.vendorDocuments.find(item =>
        Number(item.vendor_id) === Number(vendor_id) &&
        item.document_type === document_type
      );

      if (!document) {
        document = {
          id: store.counters.vendorDocument++,
          vendor_id,
          document_type,
          file_name,
          file_type,
          file_size,
          file_data,
          status: 'pending',
          rejection_reason: null,
          reviewed_at: null,
          uploaded_at: now(),
          updated_at: now(),
        };
        store.vendorDocuments.unshift(document);
      } else {
        Object.assign(document, {
          file_name,
          file_type,
          file_size,
          file_data,
          status: 'pending',
          rejection_reason: null,
          reviewed_at: null,
          updated_at: now(),
        });
      }

      return document;
    }

    await db.execute(
      `INSERT INTO vendor_documents
        (vendor_id, document_type, file_name, file_type, file_size, status, rejection_reason, reviewed_at, file_data)
       VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, ?)
       ON DUPLICATE KEY UPDATE
        file_name = VALUES(file_name),
        file_type = VALUES(file_type),
        file_size = VALUES(file_size),
        file_data = VALUES(file_data),
        status = 'pending',
        rejection_reason = NULL,
        reviewed_at = NULL,
        updated_at = CURRENT_TIMESTAMP`,
      [vendor_id, document_type, file_name, file_type, file_size, file_data]
    );

    const documents = await this.findByVendor(vendor_id);
    return documents.find(document => document.document_type === document_type);
  },

  async updateStatus({ vendor_id, document_type, status, rejection_reason = null }) {
    if (!['pending', 'verified', 'rejected'].includes(status)) {
      throw new Error('Invalid document status');
    }

    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const document = store.vendorDocuments.find(item =>
        Number(item.vendor_id) === Number(vendor_id) &&
        item.document_type === document_type
      );
      if (!document) return null;

      Object.assign(document, {
        status,
        rejection_reason: status === 'rejected' ? rejection_reason : null,
        reviewed_at: now(),
        updated_at: now(),
      });
      return document;
    }

    const [result] = await db.execute(
      `UPDATE vendor_documents
       SET status = ?, rejection_reason = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE vendor_id = ? AND document_type = ?`,
      [status, status === 'rejected' ? rejection_reason : null, vendor_id, document_type]
    );
    return result.affectedRows > 0;
  },
};

module.exports = VendorDocument;
