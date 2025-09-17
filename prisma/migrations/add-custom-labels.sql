-- Add custom_labels table for user-defined label sizes

CREATE TABLE IF NOT EXISTS custom_labels (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    "organizationId" VARCHAR NOT NULL,
    "createdBy" VARCHAR NOT NULL,

    -- Label specifications (in millimeters)
    width FLOAT NOT NULL,
    height FLOAT NOT NULL,
    columns INTEGER NOT NULL,
    rows INTEGER NOT NULL,
    "topMargin" FLOAT NOT NULL,
    "leftMargin" FLOAT NOT NULL,
    "rightMargin" FLOAT,
    "bottomMargin" FLOAT,
    "horizontalSpacing" FLOAT NOT NULL,
    "verticalSpacing" FLOAT NOT NULL,
    "pageWidth" FLOAT NOT NULL DEFAULT 210,
    "pageHeight" FLOAT NOT NULL DEFAULT 297,

    -- Metadata
    category VARCHAR NOT NULL DEFAULT 'custom',
    "isShared" BOOLEAN NOT NULL DEFAULT false,

    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),

    -- Foreign keys
    CONSTRAINT fk_custom_labels_organization FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_custom_labels_creator FOREIGN KEY ("createdBy") REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_labels_organization ON custom_labels("organizationId");
CREATE INDEX IF NOT EXISTS idx_custom_labels_creator ON custom_labels("createdBy");