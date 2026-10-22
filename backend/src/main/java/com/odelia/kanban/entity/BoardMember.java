package com.odelia.kanban.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;

/**
 * Records that {@code username} (a {@code preferred_username}) has
 * {@code MEMBER} access to a board.
 *
 * <p>The board's owner is deliberately <em>never</em> stored here:
 * {@link Board#getOwner()} already answers that question, so there is a single
 * source of truth for ownership. As with {@link BoardList}, the board is
 * referenced by id rather than through a JPA association. The unique constraint
 * guarantees a user cannot be a member of the same board twice, even if two
 * requests race past the application-level check.</p>
 */
@Entity
@Table(name = "BOARD_MEMBER",
       uniqueConstraints = @UniqueConstraint(name = "UK_BOARD_MEMBER", columnNames = { "BOARD_ID", "USERNAME" }))
public class BoardMember {

    /** Collaborator rights: work on the content of the board, not on the board itself. */
    public static final String MEMBER = "MEMBER";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "BOARD_ID", nullable = false)
    private long boardId;

    @Column(name = "USERNAME", nullable = false, length = 120)
    private String username;

    @Column(name = "ROLE", nullable = false, length = 20)
    private String role = MEMBER;

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;

    public BoardMember() {
    }

    public BoardMember(long boardId, String username) {
        this.boardId = boardId;
        this.username = username;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public long getBoardId() {
        return boardId;
    }

    public void setBoardId(long boardId) {
        this.boardId = boardId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
