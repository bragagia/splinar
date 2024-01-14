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
    )
VALUES
    (
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
    ),
    (
            '00000000-0000-0000-0000-000000000000',
            'c3ab550a-cd69-4b6b-bac0-0d7e5ae807c0',
            'authenticated',
            'authenticated',
            'mathias+superadmin@localhost.com',
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
        installation_fetched
    )
VALUES
    (
        '29b370ec-3e85-47ab-b597-5caa1140c4fb',
        '2023-11-06 15:12:35.332892+00',
        'f30a6561-31f7-4d0a-b0b8-227677374bb0',
        'eu1-2fed-c00d-4633-b154-5d03726492c0',
        'lasthunas.com',
        'mathias@bragagia.com',
        'Las Thunas',
        143540917,
        'FRESH',
        false
    ),
    (
        '6a96d8e3-2fee-48c0-ac4d-8bcc7796f126',
        '2023-10-17 19:49:45.033466+00',
        'f30a6561-31f7-4d0a-b0b8-227677374bb0',
        'eu1-8445-b7c8-40c8-a8ff-327909b06e60',
        'dummy.com',
        'mathias@bragagia.com',
        'Les Pipes',
        143393290,
        'FRESH',
        false
    ),
    (
        'ff999615-0a90-45b5-8232-6f97fa4226ad',
        '2023-10-17 19:49:45.033466+00',
        'c3ab550a-cd69-4b6b-bac0-0d7e5ae807c0',
        'eu1-8445-b7c8-40c8-a8ff-327909b06e60',
        'dummy.com',
        'mathias@bragagia.com',
        'Les Pipes du Superadmin',
        143393290,
        'FRESH',
        false
    );

INSERT INTO
    user_roles (
        user_id,
        role
    )
VALUES
    (
        'c3ab550a-cd69-4b6b-bac0-0d7e5ae807c0',
        'SUPERADMIN'
    );