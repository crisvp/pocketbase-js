export interface ListResult<T> {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
    items: T[];
}

export interface BaseModel extends Record<string, unknown> {
    id: string;
    created: string;
    updated: string;
}

export interface AdminModel extends RecordModel {
    avatar: number;
    email: string;
}

export interface SchemaField {
    id: string;
    name: string;
    type: string;
    system: boolean;
    required: boolean;
    presentable: boolean;
    options: Record<string, unknown>;
}

export interface CollectionModel extends RecordModel {
    name: string;
    type: string;
    schema: SchemaField[];
    indexes: string[];
    system: boolean;
    listRule?: string;
    viewRule?: string;
    createRule?: string;
    updateRule?: string;
    deleteRule?: string;
    options: Record<string, unknown>;
}

export interface ExternalAuthModel extends BaseModel {
    recordId: string;
    collectionId: string;
    provider: string;
    providerId: string;
}

export interface LogModel extends BaseModel {
    level: string;
    message: string;
    data: Record<string, unknown>;
}

export interface RecordModel extends BaseModel {
    collectionId: string;
    collectionName: string;
    expand?: Record<string, unknown>;
}
