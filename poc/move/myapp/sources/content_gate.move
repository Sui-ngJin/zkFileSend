module myapp::content_gate_ticket {
    use std::hash;
    use std::vector;
    use sui::clock;
    use sui::object;
    use sui::tx_context::TxContext;
    use sui::transfer;

    const ENoAccess: u64 = 1;
    const ENotAdmin: u64 = 2;
    const EBadTicket: u64 = 3;
    const EZeroTickets: u64 = 4;
    const EEmailHashNotSet: u64 = 5;
    const EEmailHashMismatch: u64 = 6;
    const EEmailHashAlreadySet: u64 = 7;

    /// Ticket object recorded against a policy so it can be reassigned or moved via zkSend.
    struct Ticket has key, store {
        id: object::UID,
        policy_id: object::ID,
        hashed_receiver_email: vector<u8>,
        email_hash_initialized: bool,
    }

    /// Shared policy binding the Seal approval rules to every minted ticket.
    struct Policy has key {
        id: object::UID,
        admin: address,
        open_after_ms: u64,
    }

    /// Create a policy and mint `ticket_count` tickets for the designated recipient.
    /// The recipient can later redistribute the tickets using standard transfers/zkSend.
    public fun new_policy(
        admin: address,
        ticket_recipient: address,
        ticket_count: u64,
        ctx: &mut TxContext
    ) {
        assert!(ticket_count > 0, EZeroTickets);

        let policy = Policy {
            id: object::new(ctx),
            admin,
            open_after_ms: 0,
        };
        let policy_id = object::id(&policy);
        transfer::share_object(policy);

        mint_tickets_internal(policy_id, ticket_recipient, ticket_count, ctx);
    }

    fun assert_admin(p: &Policy, caller: address) {
        assert!(p.admin == caller, ENotAdmin);
    }

    /// Convenience helper for the admin to mint additional tickets later on.
    public fun mint_tickets(
        p: &Policy,
        caller: address,
        recipient: address,
        count: u64,
        ctx: &mut TxContext
    ) {
        assert!(count > 0, EZeroTickets);
        assert_admin(p, caller);
        let policy_id = object::id(p);
        mint_tickets_internal(policy_id, recipient, count, ctx);
    }

    fun mint_tickets_internal(
        policy_id: object::ID,
        recipient: address,
        count: u64,
        ctx: &mut TxContext
    ) {
        let i = 0u64;
        while (i < count) {
            let ticket = Ticket {
                id: object::new(ctx),
                policy_id,
                hashed_receiver_email: vector::empty<u8>(),
                email_hash_initialized: false,
            };
            transfer::transfer(ticket, recipient);
            i = i + 1;
        };
    }

    /// Admin can adjust the optional time lock (0 disables the gate).
    public fun set_open_after_ms(p: &mut Policy, caller: address, t: u64) {
        assert_admin(p, caller);
        p.open_after_ms = t;
    }

    /// Anyone holding a ticket tied to the policy can transfer it manually or via zkSend links.
    #[allow(lint(custom_state_change))]
    public fun transfer_ticket(t: Ticket, to: address) {
        transfer::transfer(t, to);
    }

    /// Owner of a ticket sets the receiver email that will be required during decrypt.
    entry fun set_ticket_email(ticket: &mut Ticket, email: vector<u8>) {
        assert!(!ticket.email_hash_initialized, EEmailHashAlreadySet);
        ticket.hashed_receiver_email = hash::sha3_256(email);
        ticket.email_hash_initialized = true;
    }

    /// Seal verification hook. The dry-run call confirms the ticket matches the policy
    /// and (optionally) the timelock has elapsed. The actual blob id is unused.
    public fun seal_approve_with_ticket(
        id: vector<u8>,
        p: &Policy,
        t: &Ticket,
        clk: &clock::Clock,
        email_input: vector<u8>
    ) {
        if (p.open_after_ms > 0) {
            assert!(clock::timestamp_ms(clk) >= p.open_after_ms, ENoAccess);
        };
        let same_policy = t.policy_id == object::id(p);
        assert!(same_policy, EBadTicket);

        assert!(t.email_hash_initialized, EEmailHashNotSet);
        let expected = &t.hashed_receiver_email;
        let provided = hash::sha3_256(email_input);
        let matches = bytes_equal(expected, &provided);
        assert!(matches, EEmailHashMismatch);

        let _ = id;
    }

    fun bytes_equal(a: &vector<u8>, b: &vector<u8>): bool {
        if (vector::length(a) != vector::length(b)) {
            return false
        };
        let i = 0u64;
        let len = vector::length(a);
        while (i < len) {
            if (*vector::borrow(a, i) != *vector::borrow(b, i)) {
                return false
            };
            i = i + 1;
        };
        true
    }
}
