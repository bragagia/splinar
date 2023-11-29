-- supabase/seed.sql
--
-- create test users

-- user_id = 'f30a6561-31f7-4d0a-b0b8-227677374bb0'

INSERT INTO
    auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) (
        select
            '00000000-0000-0000-0000-000000000000',
            'f30a6561-31f7-4d0a-b0b8-227677374bb0',
            'authenticated',
            'authenticated',
            'mathias@localhost.com',
            crypt ('password123', gen_salt ('bf')),
            current_timestamp,
            current_timestamp,
            current_timestamp,
            '{"provider":"email","providers":["email"]}',
            '{}',
            current_timestamp,
            current_timestamp,
            '',
            '',
            '',
            ''
        FROM
            generate_series(1, 1)
    );

-- test user email identities
INSERT INTO
    auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) (
        select
            uuid_generate_v4 (),
            id,
            format('{"sub":"%s","email":"%s"}', id::text, email)::jsonb,
            'email',
            current_timestamp,
            current_timestamp,
            current_timestamp
        from
            auth.users
    );

INSERT INTO
    workspaces (
        id,
        created_at,
        user_id,
        refresh_token,
        domain,
        user_mail,
        display_name,
        hub_id,
        installation_status,
        installation_fetched,
        installation_similarity_total_batches,
        installation_similarity_done_batches,
        installation_dup_total,
        installation_dup_done
    )
VALUES
    (
        uuid_generate_v4 (),
        '2023-11-06 15:12:35.332892+00',
        'f30a6561-31f7-4d0a-b0b8-227677374bb0',
        'eu1-2fed-c00d-4633-b154-5d03726492c0',
        'lasthunas.com',
        'mathias@bragagia.com',
        'Las Thunas',
        143540917,
        'FRESH',
        false,
        0,
        0,
        0,
        0
    ),
    (
        uuid_generate_v4 (),
        '2023-10-17 19:49:45.033466+00',
        'f30a6561-31f7-4d0a-b0b8-227677374bb0',
        'eu1-8445-b7c8-40c8-a8ff-327909b06e60',
        'dummy.com',
        'mathias@bragagia.com',
        'Les Pipes',
        143393290,
        'FRESH',
        false,
        0,
        0,
        0,
        0
    );