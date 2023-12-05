CREATE OR REPLACE FUNCTION mark_companies_without_similarities_as_dup_checked(workspace_id_arg uuid)
RETURNS VOID AS
$$
BEGIN
    UPDATE companies
    SET
        dup_checked = true
    WHERE
        id IN (
            SELECT
                companies.id
            FROM
                companies
                LEFT JOIN company_similarities ON company_similarities.company_a_id = companies.id
                OR company_similarities.company_b_id = companies.id
            WHERE
                company_similarities.company_a_id IS NULL
                AND company_similarities.company_b_id IS NULL
                AND companies.workspace_id = workspace_id_arg
            GROUP BY
                companies.id
        );
END;
$$
LANGUAGE plpgsql;