module myapp::content_gate_ticket {
    use std::hash;
    use std::vector;
    use sui::tx_context;
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
    }
    /// Create a policy and mint one ticket with hashed email set.
    /// Returns (policy_id, ticket_id) tuple.
    /// The recipient can later redistribute the ticket using standard transfers/zkSend.
    public fun new_policy(
        admin: address,
        hashed_email: vector<u8>,
        ctx: &mut TxContext
    ): (object::ID, object::ID) {
        let policy = Policy {
            id: object::new(ctx),
            admin,
        };
        let policy_id = object::id(&policy);

        let ticket_id = mint_ticket(policy_id, hashed_email, ctx);
        (policy_id, ticket_id)
    }

    fun assert_admin(p: &Policy, caller: address) {
        assert!(p.admin == caller, ENotAdmin);
    }

    /// Mint a single ticket with email hash set for a specific policy.
    /// Returns the ID of the created ticket.
    public fun mint_ticket(
        policy_id: object::ID,
        hashed_email: vector<u8>,
        ctx: &mut TxContext
    ): object::ID {
        let ticket = Ticket {
            id: object::new(ctx),
            policy_id,
            hashed_receiver_email: hashed_email,
            email_hash_initialized: true,
        };
        let ticket_id = object::id(&ticket);
        let sender = tx_context::sender(ctx);
        transfer::transfer(ticket, sender);
        ticket_id
    }


    /// Anyone holding a ticket tied to the policy can transfer it manually or via zkSend links.
    #[allow(lint(custom_state_change))]
    public fun transfer_ticket(t: Ticket, to: address) {
        ticket.hashed_receiver_email = hash::sha3_256(email);
        ticket.email_hash_initialized = true;
    }

    /// Seal verification hook. The dry-run call confirms the ticket matches the policy
    /// and (optionally) the timelock has elapsed. The actual blob id is unused.
    public fun seal_approve_with_ticket(
        id: vector<u8>,
        p: &Policy,
        ticket.hashed_receiver_email = hash::sha3_256(email);
        email_input: vector<u8>
    ) {
        let same_policy = t.policy_id == object::id(p);
        assert!(same_policy, EBadTicket);

        assert!(t.email_hash_initialized, EEmailHashNotSet);
        let expected = &t.hashed_receiver_email;
        let provided = hash::sha3_256(email_input);
        let matches = bytes_equal(expected, &provided);

        let _ = id;
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
