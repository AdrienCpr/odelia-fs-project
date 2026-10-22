import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';

import { signal } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { BoardDetailComponent } from './board-detail.component';

describe('BoardDetailComponent', () => {
  let http: HttpTestingController;
  const username = signal<string | null>('alice');
  const isAdmin = signal(false);

  beforeEach(async () => {
    username.set('alice');
    isAdmin.set(false);
    await TestBed.configureTestingModule({
      imports: [BoardDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { username, isAdmin } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', '7']]) } } }
      ]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the board and its columns on init', () => {
    const fixture = TestBed.createComponent(BoardDetailComponent);
    fixture.detectChanges();

    http.expectOne('/api/boards/7').flush({ id: 7, name: 'Sprint 1', owner: 'alice' });
    http.expectOne('/api/boards/7/members').flush([]);

    const listsReq = http.expectOne('/api/boards/7/lists');
    listsReq.flush([{ id: 1, boardId: 7, name: 'To do', position: 0 }]);

    http.expectOne('/api/lists/1/cards').flush([
      { id: 10, listId: 1, title: 'First card', position: 0 }
    ]);

    expect(fixture.componentInstance.board()?.name).toBe('Sprint 1');
    expect(fixture.componentInstance.cardsFor(1).length).toBe(1);
  });

  it('PATCHes the card when it is dropped into another column', () => {
    const fixture = TestBed.createComponent(BoardDetailComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    http.expectOne('/api/boards/7').flush({ id: 7, name: 'Sprint 1', owner: 'alice' });
    http.expectOne('/api/boards/7/members').flush([]);
    http.expectOne('/api/boards/7/lists').flush([
      { id: 1, boardId: 7, name: 'To do', position: 0 },
      { id: 2, boardId: 7, name: 'Doing', position: 1 }
    ]);
    http.expectOne('/api/lists/1/cards').flush([{ id: 10, listId: 1, title: 'Card', position: 0 }]);
    http.expectOne('/api/lists/2/cards').flush([]);

    const card = component.cardsFor(1)[0];
    component.drop({
      item: { data: card },
      container: { data: { id: 2 } },
      previousContainer: { data: { id: 1 } },
      previousIndex: 0,
      currentIndex: 0
    } as never);

    const move = http.expectOne('/api/cards/10/move');
    expect(move.request.method).toBe('PATCH');
    expect(move.request.body).toEqual({ targetListId: 2, position: 0 });
    move.flush({ id: 10, listId: 2, title: 'Card', position: 0 });

    expect(component.cardsFor(1).length).toBe(0);
    expect(component.cardsFor(2).length).toBe(1);
  });

  it('PUTs the card and updates it in place when the inline editor is saved', () => {
    const fixture = TestBed.createComponent(BoardDetailComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    http.expectOne('/api/boards/7').flush({ id: 7, name: 'Sprint 1', owner: 'alice' });
    http.expectOne('/api/boards/7/members').flush([]);
    http.expectOne('/api/boards/7/lists').flush([
      { id: 1, boardId: 7, name: 'To do', position: 0 }
    ]);
    http.expectOne('/api/lists/1/cards').flush([
      { id: 10, listId: 1, title: 'Card', position: 0 }
    ]);

    const card = component.cardsFor(1)[0];
    component.startEdit(card);
    expect(component.editingCardId()).toBe(10);

    component.editDraft.title = 'Card renamed';
    component.editDraft.description = 'Now with details';
    component.saveEdit(card);

    const put = http.expectOne('/api/cards/10');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ title: 'Card renamed', description: 'Now with details' });
    put.flush({ id: 10, listId: 1, title: 'Card renamed', description: 'Now with details', position: 0 });

    expect(component.editingCardId()).toBeNull();
    expect(component.cardsFor(1)[0].description).toBe('Now with details');
  });

  it('opens and closes the "add a card" composer one column at a time', () => {
    const fixture = TestBed.createComponent(BoardDetailComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    http.expectOne('/api/boards/7').flush({ id: 7, name: 'Sprint 1', owner: 'alice' });
    http.expectOne('/api/boards/7/members').flush([]);
    http.expectOne('/api/boards/7/lists').flush([
      { id: 1, boardId: 7, name: 'To do', position: 0 }
    ]);
    http.expectOne('/api/lists/1/cards').flush([]);

    expect(component.composingColumnId()).toBeNull();

    component.startComposing(1);
    expect(component.composingColumnId()).toBe(1);

    component.cancelComposing();
    expect(component.composingColumnId()).toBeNull();
  });

  it('POSTs title and description from the "add a card" form', () => {
    const fixture = TestBed.createComponent(BoardDetailComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    http.expectOne('/api/boards/7').flush({ id: 7, name: 'Sprint 1', owner: 'alice' });
    http.expectOne('/api/boards/7/members').flush([]);
    http.expectOne('/api/boards/7/lists').flush([
      { id: 1, boardId: 7, name: 'To do', position: 0 }
    ]);
    http.expectOne('/api/lists/1/cards').flush([]);

    const column = component.columns()[0];
    const draft = component.draftFor(1);
    draft.title = 'New card';
    draft.description = 'With a description';
    component.addCard(column);

    const post = http.expectOne('/api/lists/1/cards');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ title: 'New card', description: 'With a description' });
    post.flush({ id: 20, listId: 1, title: 'New card', description: 'With a description', position: 0 });

    expect(component.cardsFor(1).length).toBe(1);
    expect(draft.title).toBe('');
    expect(draft.description).toBe('');
  });

  /** Flushes the initial requests for a board owned by alice, with one member (bob). */
  function loadSharedBoard(fixture: ReturnType<typeof TestBed.createComponent<BoardDetailComponent>>): void {
    fixture.detectChanges();
    http.expectOne('/api/boards/7').flush({ id: 7, name: 'Sprint 1', owner: 'alice' });
    http.expectOne('/api/boards/7/members').flush([{ id: 1, boardId: 7, username: 'bob', role: 'MEMBER' }]);
    http.expectOne('/api/boards/7/lists').flush([]);
  }

  it('shows the members and the add/remove controls to the owner', () => {
    const fixture = TestBed.createComponent(BoardDetailComponent);
    loadSharedBoard(fixture);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.member-name')?.textContent).toContain('bob');
    expect(el.querySelector('.add-member')).not.toBeNull();
    expect(el.querySelector('.member .remove')).not.toBeNull();
  });

  it('hides the add/remove controls from a plain member but still lists the members', () => {
    username.set('bob');
    const fixture = TestBed.createComponent(BoardDetailComponent);
    loadSharedBoard(fixture);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.member-name')?.textContent).toContain('bob');
    expect(el.querySelector('.add-member')).toBeNull();
    expect(el.querySelector('.member .remove')).toBeNull();
  });

  it('lets an admin manage members of a board they do not own', () => {
    username.set('carol');
    isAdmin.set(true);
    const fixture = TestBed.createComponent(BoardDetailComponent);
    loadSharedBoard(fixture);
    fixture.detectChanges();

    expect(fixture.componentInstance.canManageMembers()).toBe(true);
  });

  it('POSTs the username and adds the returned member to the panel', () => {
    const fixture = TestBed.createComponent(BoardDetailComponent);
    const component = fixture.componentInstance;
    loadSharedBoard(fixture);

    component.newMemberName = '  carol ';
    component.addMember();

    const req = http.expectOne('/api/boards/7/members');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'carol' });
    req.flush({ id: 2, boardId: 7, username: 'carol', role: 'MEMBER' }, { status: 201, statusText: 'Created' });

    expect(component.members().map(m => m.username)).toEqual(['bob', 'carol']);
    expect(component.newMemberName).toBe('');
    expect(component.error()).toBeNull();
  });

  it('surfaces a readable error when adding a member is rejected with a 400', () => {
    const fixture = TestBed.createComponent(BoardDetailComponent);
    const component = fixture.componentInstance;
    loadSharedBoard(fixture);

    component.newMemberName = 'bob';
    component.addMember();
    http.expectOne('/api/boards/7/members').flush(null, { status: 400, statusText: 'Bad Request' });

    expect(component.error()).toContain('already a member');
    expect(component.members().length).toBe(1);
  });

  it('DELETEs a member and removes it from the panel', () => {
    const fixture = TestBed.createComponent(BoardDetailComponent);
    const component = fixture.componentInstance;
    loadSharedBoard(fixture);

    component.removeMember(component.members()[0]);
    const req = http.expectOne('/api/boards/7/members/bob');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(component.members().length).toBe(0);
  });

  it('surfaces a readable error when removing a member is refused with a 403', () => {
    const fixture = TestBed.createComponent(BoardDetailComponent);
    const component = fixture.componentInstance;
    loadSharedBoard(fixture);

    component.removeMember(component.members()[0]);
    http.expectOne('/api/boards/7/members/bob').flush(null, { status: 403, statusText: 'Forbidden' });

    expect(component.error()).toContain('only the owner');
    expect(component.members().length).toBe(1);
  });
});
