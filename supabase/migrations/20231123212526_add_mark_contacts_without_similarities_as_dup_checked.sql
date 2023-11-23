CREATE OR REPLACE FUNCTION mark_contacts_without_similarities_as_dup_checked(workspace_id_arg uuid)
RETURNS VOID AS
$$
BEGIN
    UPDATE contacts
    SET
        dup_checked = true
    WHERE
        id IN (
            SELECT
                contacts.id
            FROM
                contacts
                LEFT JOIN contact_similarities ON contact_similarities.contact_a_id = contacts.id
                OR contact_similarities.contact_b_id = contacts.id
            WHERE
                contact_similarities.contact_a_id IS NULL
                AND contact_similarities.contact_b_id IS NULL
                AND contacts.workspace_id = workspace_id_arg
            GROUP BY
                contacts.id
        );
END;
$$
LANGUAGE plpgsql;