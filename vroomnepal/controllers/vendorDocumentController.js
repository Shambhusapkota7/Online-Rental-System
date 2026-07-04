'use strict';

const VendorDocument = require('../models/VendorDocument');
const Notification = require('../models/Notification');

const vendorIdForRequest = (req) => {
  if (req.user.role === 'admin' && req.query.vendor_id) return Number(req.query.vendor_id);
  return Number(req.user.id);
};

exports.getMyDocuments = async (req, res, next) => {
  try {
    const vendorId = vendorIdForRequest(req);
    const documents = await VendorDocument.findByVendor(vendorId);
    const uploaded = documents.filter(document => document.status !== 'missing').length;
    const verified = documents.filter(document => document.status === 'verified').length;
    const pending = documents.filter(document => document.status === 'pending').length;
    const rejected = documents.filter(document => document.status === 'rejected').length;

    res.json({
      success: true,
      count: documents.length,
      stats: {
        total: documents.length,
        uploaded,
        verified,
        pending,
        rejected,
        complete: verified === documents.length,
      },
      documents,
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    const document = await VendorDocument.upsert({
      vendor_id: req.user.id,
      document_type: req.body.document_type,
      file_name: req.body.file_name,
      file_type: req.body.file_type || null,
      file_size: req.body.file_size ? Number(req.body.file_size) : null,
      file_data: req.body.file_data || null,
    });

    await Notification.create({
      user_id: req.user.id,
      type: 'vendor_document_uploaded',
      title: 'Document submitted',
      message: `${document.title || 'Document'} submitted for verification`,
    });

    res.status(201).json({
      success: true,
      message: 'Document submitted for verification',
      document,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDocumentStatus = async (req, res, next) => {
  try {
    const updated = await VendorDocument.updateStatus({
      vendor_id: Number(req.params.vendorId),
      document_type: req.params.type,
      status: req.body.status,
      rejection_reason: req.body.rejection_reason || null,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    await Notification.create({
      user_id: Number(req.params.vendorId),
      type: 'vendor_document_reviewed',
      title: 'Document review updated',
      message: `Your ${req.params.type.replace(/_/g, ' ')} is now ${req.body.status}`,
    });

    res.json({ success: true, message: 'Document status updated' });
  } catch (error) {
    next(error);
  }
};
