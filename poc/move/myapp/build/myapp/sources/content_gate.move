module myapp::content_gate {
    use std::vector;
    use sui::clock;
    use sui::tx_context;
    use sui::object;
    use sui::transfer;

    const ENoAccess: u64 = 1;
    const ENotAdmin: u64 = 2;

    /// Shared object Policy
    struct Policy has key {
        id: object::UID,          // MUST be first field for objects
        admin: address,
        allow: vector<address>,
        open_after_ms: u64,       // 0 disables timelock
    }

    /// Create and share Policy (no return on entry)
    public fun new_policy(admin: address, ctx: &mut tx_context::TxContext) {
        let policy = Policy {
            id: object::new(ctx),
            admin,
            allow: vector::empty<address>(),
            open_after_ms: 0,
        };
        transfer::share_object(policy);
    }

    fun assert_admin(p: &Policy, caller: address) {
        assert!(p.admin == caller, ENotAdmin);
    }

    /// Update allowlist (replace)
    public fun set_allowlist(p: &mut Policy, caller: address, new_list: vector<address>) {
        assert_admin(p, caller);
        p.allow = new_list;
    }

    /// Update timelock (0 disables)
    public fun set_open_after_ms(p: &mut Policy, caller: address, t: u64) {
        assert_admin(p, caller);
        p.open_after_ms = t;
    }

    /// Approval called by Seal key servers via dry-run
    public fun seal_approve_simple(
        id: vector<u8>,
        p: &Policy,
        claimer: address,
        clk: &clock::Clock,
    ) {
        if (p.open_after_ms > 0) {
            // legacy edition: use function call, not method syntax
            assert!(clock::timestamp_ms(clk) >= p.open_after_ms, ENoAccess);
        };
        let ok = contains_address(&p.allow, claimer);
        assert!(ok, ENoAccess);
        let _ = id; // unused in simple example
    }

    /// Linear search helper (legacy-friendly)
    fun contains_address(v: &vector<address>, who: address): bool {
        let i = 0;
        let n = vector::length<address>(v);
        while (i < n) {
            if (*vector::borrow<address>(v, i) == who) {
                return true
            };
            i = i + 1;
        };
        false
    }
}
