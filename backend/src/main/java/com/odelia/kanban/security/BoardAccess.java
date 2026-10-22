package com.odelia.kanban.security;

import com.odelia.kanban.entity.Board;
import com.odelia.kanban.entity.BoardList;
import com.odelia.kanban.entity.Card;
import com.odelia.kanban.repository.BoardListRepository;
import com.odelia.kanban.repository.BoardMemberRepository;
import com.odelia.kanban.repository.BoardRepository;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.ForbiddenException;

/**
 * Authorization. A board has two levels of access:
 *
 * <ul>
 *   <li><b>collaborator</b> ({@link #requireBoardAccess}): the owner, any
 *       {@code BoardMember}, or an {@code admin}. May read the board and work
 *       on everything inside it (columns and cards);</li>
 *   <li><b>owner</b> ({@link #requireBoardOwner}): the owner or an
 *       {@code admin}. Additionally may rename or delete the board and manage
 *       its membership.</li>
 * </ul>
 *
 * <p>{@code @RolesAllowed} alone only answers "is this a signed-in Kanban
 * user?", which is not enough: every user has the {@code user} role, so without
 * these checks anyone could read someone else's board by guessing its id. The
 * coarse role check and this fine-grained one are complementary.</p>
 *
 * <p>Columns and cards store no owner of their own; they inherit access by
 * walking up to their board. Because everything inside a board is "collaborator"
 * level, the column/card checks use {@link #requireBoardAccess}. Membership is
 * read from the database on every request, so removing a member takes effect
 * immediately.</p>
 */
@RequestScoped
public class BoardAccess {

    @Inject
    CurrentUser currentUser;

    @Inject
    BoardRepository boards;

    @Inject
    BoardListRepository lists;

    @Inject
    BoardMemberRepository members;

    /** Fails with 403 unless the caller is the owner, a member or an admin. */
    public void requireBoardAccess(Board board) {
        if (!currentUser.isAdmin() && !isOwner(board) && !isMember(board)) {
            throw new ForbiddenException("Board " + board.getId() + " belongs to someone else");
        }
    }

    /** Fails with 403 unless the caller is the owner or an admin: a member is not enough. */
    public void requireBoardOwner(Board board) {
        if (!currentUser.isAdmin() && !isOwner(board)) {
            throw new ForbiddenException("Only the owner of board " + board.getId() + " can do that");
        }
    }

    /** True when the caller can manage the board itself (owner or admin). */
    public boolean canManage(Board board) {
        return currentUser.isAdmin() || isOwner(board);
    }

    /** The same check as {@link #requireBoardAccess}, reached through the column's board. */
    public void requireColumnAccess(BoardList column) {
        requireBoardAccess(boardOf(column));
    }

    /** The same check, reached through the card's column and then its board. */
    public void requireCardAccess(Card card) {
        requireColumnAccess(columnOf(card));
    }

    private boolean isOwner(Board board) {
        return currentUser.name().equals(board.getOwner());
    }

    private boolean isMember(Board board) {
        return board.getId() != null && members.existsByBoardIdAndUsername(board.getId(), currentUser.name());
    }

    private Board boardOf(BoardList column) {
        return boards.findById(column.getBoardId())
                     .orElseThrow(() -> orphan("column " + column.getId()));
    }

    private BoardList columnOf(Card card) {
        return lists.findById(card.getListId())
                    .orElseThrow(() -> orphan("card " + card.getId()));
    }

    /** With no board to check against, nobody can be shown to have access: deny. */
    private ForbiddenException orphan(String what) {
        return new ForbiddenException("Cannot establish who owns " + what);
    }
}
