import { CrudService } from "@/services/utils/CrudService";
import { CollectionModel } from "@/services/utils/dtos";
import { CommonOptions } from "@/services/utils/options";

export class CollectionService extends CrudService<CollectionModel> {
    /**
     * @inheritdoc
     */
    readonly baseCrudPath = "/api/collections";

    /**
     * Imports the provided collections.
     *
     * If `deleteMissing` is `true`, all local collections and schema fields,
     * that are not present in the imported configuration, WILL BE DELETED
     * (including their related records data)!
     *
     * @throws {ClientResponseError}
     */
    async import(
        collections: CollectionModel[],
        deleteMissing = false,
        options?: CommonOptions,
    ): Promise<true> {
        options = Object.assign(
            {
                method: "PUT",
                body: {
                    collections: collections,
                    deleteMissing: deleteMissing,
                },
            },
            options,
        );

        return this.client
            .send(this.baseCrudPath + "/import", options)
            .then(() => true);
    }
}
